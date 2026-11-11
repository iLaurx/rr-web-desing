import { createRoundRobin } from './src/roundRobin.js';

const $ = id => document.getElementById(id);
const initialTasks = [
  { id: 'P1', arrivalTime: 0, burstTime: 8 },
  { id: 'P2', arrivalTime: 1, burstTime: 10 },
  { id: 'P3', arrivalTime: 2, burstTime: 12 }
];
let tasks = initialTasks.map(task => ({ ...task }));
let engine = createRoundRobin(tasks);
let started = false;
let timer = null;

function node(tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}
const flowSvg = $('flow-lines');
const flowRoutes = {
  ready: ['waiting-box', 'ready-box', '#f6dd5b'],
  dispatch: ['ready-box', 'cpu-box', '#69cfff'],
  quantumExpired: ['cpu-box', 'waiting-box', '#c4ff58'],
  blocked: ['cpu-box', 'blocked-box', '#ff7373'],
  unblocked: ['blocked-box', 'waiting-box', '#ffb15c'],
  complete: ['cpu-box', 'finished-box', '#75ef91']
};
const svgNS = 'http://www.w3.org/2000/svg';
function routePath(name) {
  const bounds = flowSvg.getBoundingClientRect();
  const rect = id => {
    const r = $(id).getBoundingClientRect();
    return { left: r.left - bounds.left, right: r.right - bounds.left,
      top: r.top - bounds.top, bottom: r.bottom - bounds.top,
      cx: r.left + r.width / 2 - bounds.left, cy: r.top + r.height / 2 - bounds.top,
      height: r.height };
  };
  const waiting = rect('waiting-box'), ready = rect('ready-box');
  const cpu = rect('cpu-box'), blocked = rect('blocked-box'), finished = rect('finished-box');
  const points = (coords) => coords.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ');
  // Las patitas se dibujan cada 19 px desde el 12 % de la altura del chip.
  const pin = (targetY) => {
    const first = cpu.top + cpu.height * 0.12 + 2.5;
    const max = Math.max(0, Math.floor((cpu.height * 0.76 - 5) / 19));
    return first + Math.max(0, Math.min(max, Math.round((targetY - first) / 19))) * 19;
  };
  if (window.matchMedia('(min-width: 701px)').matches) {
    if (name === 'ready') return points([[waiting.cx, waiting.bottom], [ready.cx, ready.top]]);
    if (name === 'unblocked') {
      const top = Math.min(waiting.top, blocked.top) - 20;
      return points([[blocked.cx, blocked.top], [blocked.cx, top], [waiting.cx, top], [waiting.cx, waiting.top]]);
    }
    const right = name === 'blocked' || name === 'complete';
    const target = name === 'dispatch' ? ready : name === 'quantumExpired' ? waiting : name === 'blocked' ? blocked : finished;
    const x1 = right ? cpu.right + 12 : cpu.left - 12;
    const x2 = right ? target.left : target.right;
    const y1 = pin(target.cy), mid = (x1 + x2) / 2;
    const path = [[x1, y1], [mid, y1], [mid, target.cy], [x2, target.cy]];
    if (name === 'dispatch') path.reverse();
    return points(path);
  }
  // En pantallas estrechas las tarjetas cambian de posición: se conectan por
  // los centros de sus bordes con tramos horizontales y verticales.
  const [fromId, toId] = flowRoutes[name];
  const from = rect(fromId), to = rect(toId);
  const dx = to.cx - from.cx, dy = to.cy - from.cy;
  if (Math.abs(dy) >= Math.abs(dx)) {
    const y1 = dy >= 0 ? from.bottom : from.top;
    const y2 = dy >= 0 ? to.top : to.bottom;
    const mid = (y1 + y2) / 2;
    return points([[from.cx, y1], [from.cx, mid], [to.cx, mid], [to.cx, y2]]);
  }
  const x1 = dx >= 0 ? from.right : from.left;
  const x2 = dx >= 0 ? to.left : to.right;
  const mid = (x1 + x2) / 2;
  return points([[x1, from.cy], [mid, from.cy], [mid, to.cy], [x2, to.cy]]);
}
function drawFlows() {
  flowSvg.replaceChildren();
  const defs = document.createElementNS(svgNS, 'defs');
  for (const [name, [, , color]] of Object.entries(flowRoutes)) {
    const marker = document.createElementNS(svgNS, 'marker');
    marker.id = `arrow-${name}`;
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '9'); marker.setAttribute('refY', '5');
    marker.setAttribute('markerWidth', '6'); marker.setAttribute('markerHeight', '6');
    marker.setAttribute('orient', 'auto');
    const arrow = document.createElementNS(svgNS, 'path');
    arrow.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
    arrow.setAttribute('fill', color); marker.append(arrow); defs.append(marker);
  }
  flowSvg.append(defs);
  for (const [name, [from, to, color]] of Object.entries(flowRoutes)) {
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', routePath(name));
    path.setAttribute('class', 'flow-track');
    path.style.setProperty('--flow-color', color);
    path.dataset.route = name;
    path.setAttribute('marker-end', `url(#arrow-${name})`);
    flowSvg.append(path);
  }
}
function animateEvents(events) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (const event of events) {
    const route = flowRoutes[event.type];
    if (!route) continue;
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', routePath(event.type));
    path.setAttribute('class', 'flow-pulse');
    path.style.setProperty('--flow-color', route[2]);
    flowSvg.append(path);
    const length = path.getTotalLength();
    if (!length) { path.remove(); continue; }
    const animation = path.animate(reduced
      ? [{ opacity: 1 }, { opacity: 0 }]
      : [{ strokeDasharray: `18 ${length + 18}`, strokeDashoffset: '18', opacity: 1 },
         { strokeDasharray: `18 ${length + 18}`, strokeDashoffset: String(-length), opacity: 1 }],
      { duration: reduced ? 500 : 850, easing: 'ease-in-out' });
    animation.onfinish = () => path.remove();
  }
}
new ResizeObserver(drawFlows).observe(document.querySelector('.orbit-layout'));
window.addEventListener('resize', drawFlows);
function stop() { if (timer !== null) clearInterval(timer); timer = null; }
function reset() { stop(); started = false; engine = createRoundRobin(tasks); $('message').textContent = ''; render(); drawFlows(); }
function describe(event) {
  switch (event.type) {
    case 'arrival': return `${event.taskId} llegó a la cola`;
    case 'ready': return `${event.taskId} entra a listos`;
    case 'blocked': return `${event.taskId} se bloqueó durante 14 s`;
    case 'unblocked': return `${event.taskId} terminó su bloqueo`;
    case 'dispatch': return `${event.taskId} entra a la CPU`;
    case 'execute': return `${event.taskId} se ejecutó de ${event.time} a ${event.endTime} s`;
    case 'idle': return `CPU inactiva de ${event.time} a ${event.endTime} s`;
    case 'complete': return `${event.taskId} terminó`;
    case 'quantumExpired': return `${event.taskId} agotó su quantum y vuelve a la cola`;
    default: return event.type;
  }
}
function render() {
  const state = engine.snapshot();
  const locked = started;
  $('task-id').disabled = locked; $('arrival').disabled = locked; $('burst').disabled = locked;
  $('task-form').querySelector('button').disabled = locked;
  $('process-count').disabled = locked;
  $('generate-form').querySelector('button').disabled = locked;
  $('play').disabled = !tasks.length || state.done;
  $('block').disabled = !state.running || state.done;
  $('play').textContent = timer !== null ? 'Ⅱ Pausar' : '▷ Ejecutar';
  $('time').textContent = String(state.time).padStart(2, '0');
  $('cpu').textContent = state.running ?? '...';
  $('cpu').setAttribute('aria-label', state.running ? `En ejecución: ${state.running}` : 'CPU en espera');
  // Conserva el último intervalo visible hasta el siguiente segundo, aunque
  // el motor ya haya finalizado o reencolado el proceso en esa frontera.
  let displayedSlice = state.sliceUsed;
  if (!state.running) {
    const boundary = [...state.events].reverse().find(event =>
      ['dispatch', 'complete', 'quantumExpired', 'blocked', 'idle'].includes(event.type));
    if (boundary && boundary.time === state.time && ['complete', 'quantumExpired'].includes(boundary.type)) {
      const dispatchIndex = state.events.length - 1 - [...state.events].reverse().findIndex(event => event.type === 'dispatch' && event.taskId === boundary.taskId);
      displayedSlice = state.events.slice(dispatchIndex + 1).filter(event => event.type === 'execute' && event.taskId === boundary.taskId).length;
    }
  }
  $('quantum').textContent = `Quantum: ${displayedSlice} / ${state.quantum} s`;
  document.querySelectorAll('.cpu-meter i').forEach((segment, index) => segment.classList.toggle('active', index < displayedSlice));
  $('status').textContent = state.done && tasks.length ? 'Simulación terminada' : timer !== null ? 'En ejecución' : started ? 'En pausa' : 'Lista para iniciar';
  const lastTick = [...state.events].reverse().find(e => e.type === 'execute' || e.type === 'idle');
  $('last-action').textContent = lastTick ? describe(lastTick) + '.' : 'Agrega tareas e inicia la simulación.';
  const queue = $('queue'); queue.replaceChildren();
  if (!state.readyQueue.length) queue.append(node('span', 'Sin tareas listas', 'empty'));
  state.readyQueue.forEach(id => {
    const task = state.tasks.find(item => item.id === id);
    queue.append(node('span', `${id} · ${task.remainingTime} s`, 'chip'));
  });
  function renderList(id, entries, emptyText) {
    const container = $(id); container.replaceChildren();
    if (!entries.length) container.append(node('span', emptyText, 'empty'));
    entries.forEach(text => container.append(node('span', text, 'chip')));
  }
  renderList('waiting', state.waitingQueue.map(id => {
    const task = state.tasks.find(item => item.id === id);
    return `${id} · ${task.remainingTime} s`;
  }), 'Sin procesos en espera');
  renderList('blocked', state.blockedQueue.map(item => `${item.id} · ${item.secondsLeft} s para desbloquear`), 'Sin procesos bloqueados');
  renderList('finished', state.finished, 'Aún no hay procesos terminados');
  const body = $('tasks'); body.replaceChildren();
  if (!state.tasks.length) {
    const row = document.createElement('tr'); const cell = node('td', 'Agrega una tarea para comenzar.', 'empty'); cell.colSpan = 7; row.append(cell); body.append(row);
  }
  const labels = { pending: 'Pendiente', ready: 'Lista', waiting: 'En espera', blocked: 'Bloqueada', running: 'En CPU', finished: 'Terminada' };
  state.tasks.forEach(task => {
    const row = document.createElement('tr');
    [task.id, task.arrivalTime, task.burstTime, task.remainingTime, labels[task.state], task.waitingTime ?? '—'].forEach(value => row.append(node('td', String(value))));
    const cell = document.createElement('td'); const button = node('button', 'Quitar', 'remove'); button.type = 'button'; button.disabled = locked;
    button.setAttribute('aria-label', `Quitar ${task.id}`);
    button.addEventListener('click', () => { tasks = tasks.filter(t => t.id !== task.id); reset(); });
    cell.append(button); row.append(cell); body.append(row);
  });
  const timeline = $('timeline'); timeline.replaceChildren();
  const ticks = state.events.filter(e => e.type === 'execute' || e.type === 'idle');
  if (!ticks.length) timeline.append(node('span', 'La ejecución aparecerá aquí.', 'empty'));
  ticks.forEach(event => {
    const tick = node('div', event.taskId ?? 'Libre', `tick${event.type === 'idle' ? ' idle' : ''}`);
    tick.append(node('small', `${event.time} → ${event.endTime} s`)); timeline.append(tick);
  });
  const events = $('events'); events.replaceChildren();
  if (!state.events.length) events.append(node('li', 'Aún no hay eventos.'));
  [...state.events].reverse().slice(0, 12).forEach(event => {
    const item = document.createElement('li'); item.append(node('time', `t=${event.time} s`), document.createTextNode(describe(event))); events.append(item);
  });
}
function advance() {
  if (!tasks.length || engine.snapshot().done) { stop(); render(); return; }
  started = true; const previousCount = engine.snapshot().events.length;
  const state = engine.step(); if (state.done) stop(); render();
  animateEvents(state.events.slice(previousCount));
}
$('generate-form').addEventListener('submit', event => {
  event.preventDefault();
  if (started) return;
  const count = Number($('process-count').value);
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    $('message').textContent = 'Indica una cantidad entre 1 y 100.';
    return;
  }
  tasks = Array.from({ length: count }, (_, i) => ({
    id: `P${i + 1}`, arrivalTime: 0, burstTime: 8 + (i % 5)
  }));
  reset();
});
$('task-form').addEventListener('submit', event => {
  event.preventDefault();
  if (started) return;
  const id = $('task-id').value.trim(); const arrivalTime = Number($('arrival').value); const burstTime = Number($('burst').value);
  try {
    const candidate = [...tasks, { id, arrivalTime, burstTime }];
    createRoundRobin(candidate); tasks = candidate; $('task-id').value = ''; reset(); $('task-id').focus();
  } catch (error) { $('message').textContent = error.message; }
});
$('play').addEventListener('click', () => {
  if (timer !== null) { stop(); render(); return; }
  if (!tasks.length || engine.snapshot().done) return;
  started = true; timer = setInterval(advance, 1000); render();
});
$('block').addEventListener('click', () => { const previousCount = engine.snapshot().events.length; engine.blockRunning(); render(); animateEvents(engine.snapshot().events.slice(previousCount)); });
$('reset').addEventListener('click', reset);
render();

requestAnimationFrame(drawFlows);
