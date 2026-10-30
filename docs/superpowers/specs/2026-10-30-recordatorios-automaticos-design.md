# Spec: Recordatorios automáticos de turnos

- **Estado:** borrador para aprobación
- **Fecha:** 2026-10-30
- **Producto:** asistente de agenda del consultorio de la Dra. Laura

## 1. Problema

La Dra. Laura tiene un consultorio dental pequeño con una asistente. Cerca del 30% de los pacientes no llega a su turno y esos espacios se pierden. Para evitarlo, la asistente pasa buena parte de la mañana mandando recordatorios por WhatsApp, uno por uno.

El prototipo actual no resuelve ese dolor: la asistente sigue abriendo un diálogo y haciendo clic por cada paciente. Es el mismo trabajo en otra pantalla.

**Usuaria principal:** la asistente (en la demo, Sofía).

**Resultado buscado:** los recordatorios salen sin que nadie haga nada, y la asistente dedica su tiempo solo a los pacientes que necesitan una persona.

La meta de negocio es bajar el 30% de inasistencias. Esta demo no puede medirla porque no hay pacientes reales: verifica el comportamiento, no el impacto.

## 2. Alcance

### Objetivos

- Enviar recordatorios sin intervención humana.
- Dejar a la asistente una lista corta y completa de lo que requiere una persona.
- Registrar cada envío, fallo y respuesta en el historial del paciente.

### Fuera de alcance

- Seguimiento de tratamientos: la sección actual de seguimientos queda como está.
- Lista de espera o relleno de huecos.
- Conexión real con WhatsApp o Google Calendar.
- Backend, base de datos y autenticación.
- Facturación y expediente clínico.

### Antiobjetivos

Aunque funcione técnicamente, el feature fracasa si:

- La app cancela o mueve un turno por su cuenta.
- Le escribe por WhatsApp a un paciente sin autorización.
- Le manda a un paciente el mismo recordatorio dos veces.
- Un mensaje incluye información clínica.
- La interfaz sugiere que los mensajes son reales.

## 3. Decisiones

Decididas por Ignacio:

- El feature es recordatorios automáticos, no seguimiento de tratamientos.
- Todo es simulado: ningún mensaje llega a un teléfono.
- El envío es automático, sin aprobación previa de la asistente.
- Las reglas generales conversadas: dos recordatorios (48 y 24 horas antes), "Hay que llamar", nunca escribir sin autorización, un reintento por fallo y sin duplicados.

Decididas por el agente, a validar al aprobar esta spec:

- **Espera antes de "Hay que llamar":** la versión conversada mandaba al paciente a esa lista en el mismo momento en que salía el segundo recordatorio, sin darle tiempo a responder. Ahora se esperan 4 horas.
- **Casos borde:** la separación mínima entre recordatorios, el tratamiento de turnos agendados con poca anticipación y la prioridad de los reintentos.
- **Sin envío manual de recordatorios:** se elimina de toda la app, porque el automático lo reemplaza. El envío manual de mensajes de seguimiento no cambia.
- **Reloj de demo:** sin él no se puede ver en el navegador un flujo que depende de que pasen horas.
- **Vitest como dependencia de desarrollo:** el repo no tiene tests y las reglas son la parte con más riesgo.

## 4. Reglas del recordatorio

`T` es el tiempo que falta para el turno, en la zona horaria `America/Argentina/Buenos_Aires`. Un turno **elegible** cumple todo esto: está en estado `scheduled`, con asistencia `unknown`, confirmación `pending` y `T > 0`. Los turnos no elegibles no reciben mensajes ni pasan a "Hay que llamar". Un turno que ya está en "Hay que llamar" tampoco recibe mensajes: queda ahí hasta que el paciente responda, la asistente actúe o el turno pase.

En cada ciclo se aplica la primera regla que corresponda:

1. **Sin autorización:** si el paciente no tiene autorización de WhatsApp y `T ≤ 48 h`, el turno pasa a "Hay que llamar" sin enviar nada. Motivo: "Sin autorización de WhatsApp".
2. **Reintento:** si el último envío falló en su primer intento, se reintenta una vez, cualquiera sea `T`. Si vuelve a fallar, pasa a "Hay que llamar". Motivo: "No se pudo entregar".
3. **Primer recordatorio:** si nunca se intentó enviar uno y `T ≤ 48 h`, se envía. Excepción: si `T ≤ 4 h`, no se envía y pasa a "Hay que llamar". Motivo: "Turno muy cercano".
4. **Sin respuesta:** si `T ≤ 20 h` y pasaron al menos 4 horas desde el último recordatorio entregado, pasa a "Hay que llamar". Motivo: "No respondió".
5. **Segundo recordatorio:** si `T ≤ 24 h` y el primero se entregó hace al menos 12 horas, se envía.

Además:

- Cada turno recibe como máximo un primer y un segundo recordatorio. Un reintento por fallo no cuenta como recordatorio nuevo: un intento fallido ya cuenta como intento de ese paso.
- Cada ciclo envía como máximo un mensaje por turno.
- Si el ciclo no corrió a tiempo, se ejecuta lo que corresponda al abrir la app, respetando estas mismas reglas.
- Al reprogramar un turno, su ciclo vuelve a cero y sale de "Hay que llamar".

### Respuestas del paciente

| Respuesta | Efecto en el turno | Qué ve la asistente |
|---|---|---|
| Confirma | `confirmation` pasa a `confirmed`; no recibe más recordatorios | Nada |
| Pide reprogramar | `confirmation` pasa a `reschedule-requested`; la fecha no cambia | Aparece en "Solicitudes" |
| Pide cancelar | `confirmation` pasa a `cancel-requested`; el turno sigue en agenda | Aparece en "Solicitudes" |

Una respuesta puede llegar con el turno en "Hay que llamar": en ese caso aplica la tabla y el turno sale de esa lista.

### Mensajes

Español rioplatense y sin información clínica. Los dos recordatorios incluyen nombre de pila, día relativo y hora.

- **Primero:** `Hola {nombre}, te recordamos tu turno en el consultorio de la Dra. Laura para {día} a las {hora}. Respondé 1 para confirmar, 2 para reprogramar o 3 para cancelar.`
- **Segundo:** `Hola {nombre}, todavía no recibimos tu confirmación para el turno de {día} a las {hora}. Respondé 1 para confirmar, 2 para reprogramar o 3 para cancelar.`

## 5. Diseño de la solución

### Motor de recordatorios

Un módulo de TypeScript puro, sin React ni acceso al navegador, que recibe el estado y la hora actual y devuelve el estado nuevo. Corre al abrir la app, cada minuto mientras esté abierta y justo después de que la asistente reprograme o agende un turno. Correrlo varias veces con la misma hora no cambia el resultado.

La clave de idempotencia es la combinación de turno y paso (primero o segundo). No puede depender de que la pantalla se haya montado una sola vez: React puede ejecutar efectos dos veces en desarrollo.

### Envío

El motor envía a través de una interfaz chica, por ejemplo `send(mensaje) → delivered | failed`. La implementación de demo responde `delivered`, salvo para los pacientes marcados en los datos de ejemplo para fallar. Para pasar a WhatsApp real solo se reemplaza esa implementación y lo que dispara el ciclo (en producción, un proceso programado).

### Interfaz

**Inicio**

- Un resumen del día, con la aclaración de que los mensajes son simulados:
  - **Enviados:** recordatorios entregados automáticamente hoy.
  - **Confirmados:** turnos de hoy en adelante, confirmados después de recibir un recordatorio. Los turnos pasados no cuentan.
  - **Sin respuesta:** turnos futuros con un recordatorio entregado y todavía pendientes.
- **"Hay que llamar":** muestra todos los turnos, sin el límite de 5 de "Necesitan tu atención", ordenados por el turno más cercano. Cada fila tiene paciente, teléfono, día y hora, motivo y acceso al detalle.
- **"Solicitudes":** turnos con pedido de reprogramar o cancelar, con acceso al detalle.
- "Necesitan tu atención" deja de mostrar acciones de recordatorio y sigue mostrando seguimientos.

**Turnos**

- Se quita el botón de enviar recordatorio.
- Se muestra el estado del recordatorio y se agrega el filtro "Hay que llamar", que muestra los turnos de todos los días e indica el día de cada uno.

**Detalle del turno**

- Se quitan "Enviar recordatorio" y "Reintentar recordatorio".
- Se muestra en qué paso está y, si corresponde, el motivo de "Hay que llamar".
- Se agrega el bloque "Simular respuesta del paciente", visible cuando ya hay un recordatorio entregado y el turno está pendiente. Reutiliza las respuestas de `SendWhatsAppDialog`.
- Siguen las acciones actuales de marcar confirmado, reprogramar y cancelar. Con ellas la asistente saca un turno de "Hay que llamar" después de hablar con el paciente.

**Detalle del paciente**

- Se quita "Enviar recordatorio".

**Encabezado**

- Se agrega el reloj de demo: muestra la hora simulada y permite adelantarla 1, 6 o 24 horas. Solo avanza y cada avance dispara un ciclo.
- Todas las vistas toman "hoy" de ese reloj. "Restablecer demo" lo vuelve a la hora real.

### Datos

- `Appointment` necesita registrar para cada paso el envío, los intentos y el resultado, además de si está en "Hay que llamar" y por qué. La forma exacta queda a criterio de quien implementa.
- `reminder` y `reminderSentAt` pueden mantenerse como resumen para los badges existentes.
- Los datos de ejemplo cubren todos los casos sin importar a qué hora se abra la demo, incluido un paciente sin autorización y uno cuyo envío falla. Se corrigen los registros incoherentes actuales, como el recordatorio de `apt-mateo` fechado en el futuro.
- Se cambia la clave de localStorage a una versión nueva para no cargar estado con la forma anterior.

### Tests

Vitest cubre el motor con hora fija, sin depender del reloj real. La interfaz se verifica en el navegador.

## 6. Criterios de aceptación

**CA1. Envío sin intervención**
Dado un turno elegible con autorización y `T ≤ 48 h`, cuando se abre la app sin hacer ningún clic, entonces el paciente tiene un primer recordatorio entregado en su historial y el texto no contiene datos clínicos.

**CA2. Sin duplicados y con freno al confirmar**
Dado un turno con su primer recordatorio entregado, cuando el ciclo corre 10 veces con la misma hora, entonces sigue existiendo un solo recordatorio de ese paso. Y dado que el paciente confirma, cuando se adelanta el reloj hasta el turno, entonces no se envía el segundo.

**CA3. Lista completa de "Hay que llamar"**
Dados tres turnos elegibles (uno sin autorización con `T ≤ 48 h`, uno sin respuesta con `T ≤ 20 h` y 4 horas o más desde el último recordatorio, y uno con dos envíos fallidos), cuando se abre Inicio, entonces los tres aparecen en "Hay que llamar", cada uno con su motivo. Al paciente sin autorización nunca se le registró un mensaje saliente.

**CA4. La app nunca decide por la asistente**
Dado un turno, cuando el paciente pide reprogramar o cancelar, entonces aparece en "Solicitudes", mantiene su fecha y hora y sigue en agenda. El turno solo cambia cuando la asistente reprograma o cancela desde el detalle. Después de reprogramar, el ciclo de recordatorios vuelve a empezar.

**CA5. Sin envío manual y sin engaños**
Dado cualquier turno, cuando se recorren Inicio, Turnos y los detalles de turno y paciente, entonces no existe ninguna acción para enviar un recordatorio a mano, y la interfaz indica que los mensajes son simulados.

Cómo se verifica: CA1 a CA4 con tests del motor y una pasada en el navegador; CA5 en el navegador.

**Regla de trabajo:** si el resultado no cumple un criterio, se corrige primero esta spec y después se vuelve a implementar.

## 7. A criterio de quien implementa

- La forma exacta de los tipos y los nombres de los módulos.
- La distribución visual de las tarjetas en Inicio, respetando el estilo existente.
- La cantidad de datos de ejemplo.
