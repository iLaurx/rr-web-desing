# Simulador visual de Round Robin

Proyecto para mostrar paso a paso cómo una sola CPU atiende tareas mediante el algoritmo Round Robin. La referencia visual está en `idea-desing.png`: una interfaz oscura con elementos de aspecto electrónico y acentos neón.

## Alcance inicial

La primera etapa construye y verifica el motor de simulación en JavaScript para Node.js. La interfaz visual se desarrollará después, utilizando los estados y eventos que exponga el motor. El quantum inicial es de **3 unidades de tiempo**.

Las tareas tienen un identificador, un tiempo de llegada y una duración de CPU. El motor mantiene una cola FIFO de tareas listas, ejecuta una tarea a la vez y devuelve al final de la cola las tareas que no terminaron al agotar su quantum. Debe representar también los periodos en los que la CPU está inactiva.

Las instrucciones de uso y ejecución se completarán junto con el motor.

## Uso del motor

Se necesita Node.js 18 o posterior. No requiere instalar dependencias. Ejecuta `npm test` para comprobarlo.

```js
import { createRoundRobin } from './src/roundRobin.js';

const simulacion = createRoundRobin([
  { id: 'A', arrivalTime: 0, burstTime: 5 },
  { id: 'B', arrivalTime: 1, burstTime: 3 }
]);

console.log(simulacion.snapshot()); // Estado inicial
while (!simulacion.snapshot().done) {
  console.log(simulacion.step()); // Avanza una unidad de tiempo
}
```

Cada estado incluye el tiempo, la cola de tareas listas, la tarea en ejecución, el estado y las métricas de cada tarea, y el historial de eventos. Los eventos identifican llegadas, asignaciones, ejecución, inactividad, finalizaciones y vencimientos del quantum. Los identificadores deben ser textos únicos; la llegada debe ser un entero no negativo y la duración, un entero positivo.

## Abrir la página

Con Node.js 18 o posterior instalado, abre una terminal en la carpeta del proyecto y ejecuta:

```powershell
npm start
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador. No hace falta instalar paquetes. Para detener el servidor, presiona `Ctrl+C` en la terminal.

La página incluye tareas de ejemplo con duraciones de 8, 10 y 12 segundos, que puedes quitar o cambiar antes de iniciar. Agrega tareas con nombre, llegada y duración en segundos y usa **Ejecutar** para comenzar o pausar. La simulación avanza un segundo por cada segundo transcurrido mientras está activa. **Reiniciar** vuelve al tiempo cero y permite editar la lista actual. La CPU muestra el estado al final de cada segundo; la línea de tiempo muestra lo ocurrido durante cada intervalo. El quantum es fijo en 3 segundos. Las duraciones personalizadas pueden ser cualquier entero positivo.

La cola de listos admite hasta tres procesos. Los demás esperan su turno para entrar; el proceso que está en CPU no ocupa uno de esos tres lugares. El botón **Bloquear CPU** bloquea el proceso en ejecución por 14 segundos de simulación. Después pasa a listos si hay espacio o a la cola de espera si está llena. El tiempo de espera de las métricas excluye el tiempo bloqueado.

Para crear varios procesos a la vez, indica una cantidad entre 1 y 100 y pulsa **Generar procesos**. Esta acción reemplaza la lista actual por procesos P1, P2, etc., con llegada en 0 y duraciones entre 8 y 12 segundos. Después puedes quitar procesos o agregar otros manualmente antes de ejecutar.
