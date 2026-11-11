import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoundRobin, QUANTUM } from '../src/roundRobin.js';

function finish(engine) {
  while (!engine.snapshot().done) engine.step();
  return engine.snapshot();
}

test('alterna tareas y calcula tiempos con quantum 3', () => {
  const result = finish(createRoundRobin([
    { id: 'A', arrivalTime: 0, burstTime: 5 },
    { id: 'B', arrivalTime: 0, burstTime: 3 },
    { id: 'C', arrivalTime: 1, burstTime: 1 }
  ]));
  assert.equal(QUANTUM, 3);
  assert.deepEqual(result.events.filter(e => e.type === 'execute').map(e => e.taskId),
    ['A', 'A', 'A', 'B', 'B', 'B', 'C', 'A', 'A']);
  assert.deepEqual(result.tasks.map(p => [p.id, p.completionTime, p.waitingTime, p.responseTime]),
    [['A', 9, 4, 0], ['B', 6, 3, 3], ['C', 7, 5, 5]]);
});

test('incorpora llegadas en el límite antes de reencolar la tarea interrumpida', () => {
  const result = finish(createRoundRobin([
    { id: 'A', arrivalTime: 0, burstTime: 4 },
    { id: 'B', arrivalTime: 3, burstTime: 1 }
  ]));
  assert.deepEqual(result.events.filter(e => e.type === 'dispatch').map(e => e.taskId), ['A', 'B', 'A']);
});

test('registra inactividad y conserva el orden de llegadas simultáneas', () => {
  const result = finish(createRoundRobin([
    { id: 'B', arrivalTime: 2, burstTime: 1 },
    { id: 'A', arrivalTime: 2, burstTime: 1 }
  ]));
  assert.equal(result.events.filter(e => e.type === 'idle').length, 2);
  assert.deepEqual(result.events.filter(e => e.type === 'dispatch').map(e => e.taskId), ['B', 'A']);
});

test('una tarea que termina exactamente en el quantum no se reencola', () => {
  const result = finish(createRoundRobin([{ id: 'A', arrivalTime: 0, burstTime: 3 }]));
  assert.equal(result.events.some(e => e.type === 'quantumExpired'), false);
  assert.equal(result.tasks[0].completionTime, 3);
});

test('validación, simulación vacía e instantáneas independientes', () => {
  assert.throws(() => createRoundRobin([{ id: 'A', arrivalTime: -1, burstTime: 1 }]));
  assert.throws(() => createRoundRobin([{ id: 'A', arrivalTime: 0, burstTime: 0 }]));
  assert.throws(() => createRoundRobin([{ id: 'A', arrivalTime: 0, burstTime: 1 }, { id: 'A', arrivalTime: 1, burstTime: 1 }]));
  const empty = createRoundRobin([]);
  assert.equal(empty.step().done, true);
  const engine = createRoundRobin([{ id: 'A', arrivalTime: 0, burstTime: 1 }]);
  const state = engine.snapshot();
  state.tasks[0].remainingTime = 100;
  state.events.length = 0;
  assert.equal(engine.step().tasks[0].remainingTime, 0);
  assert.equal(engine.snapshot().events[0].type, 'arrival');
});

test('limita listos a tres y admite en orden a quienes esperan', () => {
  const engine = createRoundRobin(['A', 'B', 'C', 'D', 'E'].map(id => ({ id, arrivalTime: 0, burstTime: 4 })));
  assert.deepEqual(engine.snapshot().readyQueue, ['A', 'B', 'C']);
  assert.deepEqual(engine.snapshot().waitingQueue, ['D', 'E']);
  engine.step();
  assert.deepEqual(engine.snapshot().readyQueue, ['B', 'C', 'D']);
  assert.deepEqual(engine.snapshot().waitingQueue, ['E']);
  engine.step(); engine.step();
  assert.deepEqual(engine.snapshot().waitingQueue, ['E', 'A']);
});

test('bloquea la CPU durante 14 segundos y espera cupo al desbloquear', () => {
  const engine = createRoundRobin(['A', 'B', 'C', 'D', 'E'].map(id => ({ id, arrivalTime: 0, burstTime: 20 })));
  engine.step();
  assert.equal(engine.blockRunning(), true);
  assert.equal(engine.blockRunning(), false);
  assert.deepEqual(engine.snapshot().blockedQueue, [{ id: 'A', secondsLeft: 14 }]);
  for (let i = 0; i < 13; i++) engine.step();
  assert.deepEqual(engine.snapshot().blockedQueue, [{ id: 'A', secondsLeft: 1 }]);
  engine.step();
  const state = engine.snapshot();
  assert.equal(state.blockedQueue.length, 0);
  assert.ok(state.waitingQueue.includes('A') || state.readyQueue.includes('A'));
  assert.ok(state.readyQueue.length <= 3);
  assert.equal(state.events.find(e => e.type === 'unblocked').time, 15);
  const result = finish(engine);
  const task = result.tasks.find(p => p.id === 'A');
  assert.equal(task.waitingTime, task.turnaroundTime - task.burstTime - 14);
});
