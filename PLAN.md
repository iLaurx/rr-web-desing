# Plan de trabajo

1. Definir el alcance y las reglas de simulación.
2. Implementar un motor Round Robin independiente de la interfaz, con una sola CPU y quantum predeterminado de 3.
3. Verificar llegadas, rotación, finalización, CPU inactiva y casos límite mediante pruebas automatizadas.
4. En una etapa posterior, diseñar una interfaz web que permita observar la simulación paso a paso, tomando como referencia `idea-desing.png` y su estética oscura con colores neón.

## Convenciones de simulación

- El tiempo se mide en unidades discretas; la llegada y la duración son números enteros.
- La cola de tareas listas sigue el orden de llegada; las llegadas simultáneas conservan el orden de entrada.
- Al terminar un intervalo de ejecución, las tareas que llegaron hasta ese instante se incorporan antes de volver a encolar la tarea que agotó su quantum.
- Si no hay tareas listas, el reloj avanza hasta la siguiente llegada y se registra la inactividad.
- Una tarea termina cuando consume toda su duración; no existe paralelismo ni costo de cambio de contexto en esta etapa.

La interfaz, las animaciones y su apariencia se definirán después de validar el motor.
