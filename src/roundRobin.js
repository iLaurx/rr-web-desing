/** Motor determinista de Round Robin para una CPU; no depende del DOM. */
export const QUANTUM = 3;
export const READY_LIMIT = 3;
export const BLOCK_DURATION = 14;

/**
 * Cada tarea usa { id, arrivalTime, burstTime }, con tiempos enteros.
 * En una frontera de tiempo se admiten primero las llegadas y después se
 * reencola la tarea cuyo quantum terminó. El orden original desempata llegadas.
 */
export function createRoundRobin(tasks) {
  if (!Array.isArray(tasks)) throw new TypeError('Las tareas deben ser un arreglo.');
  const ids = new Set();
  const processes = tasks.map((task, order) => {
    if (!task || typeof task !== 'object' || typeof task.id !== 'string' || !task.id.trim()) {
      throw new TypeError('Cada tarea necesita un id de texto no vacío.');
    }
    if (ids.has(task.id)) throw new Error(`El id ${task.id} está repetido.`);
    ids.add(task.id);
    if (!Number.isSafeInteger(task.arrivalTime) || task.arrivalTime < 0 ||
        !Number.isSafeInteger(task.burstTime) || task.burstTime <= 0) {
      throw new RangeError('La llegada debe ser un entero no negativo y la duración un entero positivo.');
    }
    return { id: task.id, arrivalTime: task.arrivalTime, burstTime: task.burstTime,
      remainingTime: task.burstTime, firstStartTime: null, completionTime: null, blockedUntil: null, blockedTime: 0, order };
  }).sort((a, b) => a.arrivalTime - b.arrivalTime || a.order - b.order);

  let time = 0;
  let next = 0;
  let current = null;
  let sliceUsed = 0;
  const queue = [];
  const waiting = [];
  const blocked = [];
  const events = [];

  function fillReady() {
    while (queue.length < READY_LIMIT && waiting.length) {
      const task = waiting.shift();
      queue.push(task);
      events.push({ type: 'ready', time, taskId: task.id });
    }
  }
  function admit() {
    while (next < processes.length && processes[next].arrivalTime <= time) {
      const task = processes[next++];
      waiting.push(task);
      events.push({ type: 'arrival', time, taskId: task.id });
    }
    for (let i = 0; i < blocked.length;) {
      if (blocked[i].blockedUntil <= time) {
        const task = blocked.splice(i, 1)[0];
        task.blockedUntil = null;
        waiting.push(task);
        events.push({ type: 'unblocked', time, taskId: task.id });
      } else i++;
    }
    fillReady();
  }

  function snapshot() {
    return {
      time,
      quantum: QUANTUM,
      done: processes.every(task => task.completionTime !== null),
      running: current?.id ?? null,
      sliceUsed,
      readyQueue: queue.map(task => task.id),
      waitingQueue: waiting.map(task => task.id),
      blockedQueue: blocked.map(task => ({ id: task.id, secondsLeft: task.blockedUntil - time })),
      finished: processes.filter(task => task.completionTime !== null).map(task => task.id),
      tasks: processes.map(({ order, ...task }) => ({ ...task,
        state: task.completionTime !== null ? 'finished' : current === task ? 'running' :
          queue.includes(task) ? 'ready' : waiting.includes(task) ? 'waiting' : blocked.includes(task) ? 'blocked' : 'pending',
        turnaroundTime: task.completionTime === null ? null : task.completionTime - task.arrivalTime,
        waitingTime: task.completionTime === null ? null : task.completionTime - task.arrivalTime - task.burstTime - task.blockedTime,
        responseTime: task.firstStartTime === null ? null : task.firstStartTime - task.arrivalTime
      })),
      events: events.map(event => ({ ...event }))
    };
  }

  // El estado inicial ya refleja las llegadas al instante cero.
  admit();
  function step() {
    if (processes.every(task => task.completionTime !== null)) return snapshot();
    if (!current && queue.length) {
      current = queue.shift();
      fillReady();
      sliceUsed = 0;
      if (current.firstStartTime === null) current.firstStartTime = time;
      events.push({ type: 'dispatch', time, taskId: current.id });
    }
    const start = time;
    if (current) {
      current.remainingTime--;
      sliceUsed++;
      events.push({ type: 'execute', time: start, endTime: start + 1, taskId: current.id });
    } else {
      events.push({ type: 'idle', time: start, endTime: start + 1 });
    }
    time++;
    admit();
    if (current && current.remainingTime === 0) {
      current.completionTime = time;
      events.push({ type: 'complete', time, taskId: current.id });
      current = null;
      sliceUsed = 0;
    } else if (current && sliceUsed === QUANTUM) {
      events.push({ type: 'quantumExpired', time, taskId: current.id });
      waiting.push(current);
      fillReady();
      current = null;
      sliceUsed = 0;
    }
    return snapshot();
  }
  function blockRunning() {
    if (!current) return false;
    current.blockedUntil = time + BLOCK_DURATION;
    current.blockedTime += BLOCK_DURATION;
    blocked.push(current);
    events.push({ type: 'blocked', time, taskId: current.id, until: current.blockedUntil });
    current = null;
    sliceUsed = 0;
    return true;
  }
  return { step, snapshot, blockRunning };
}
