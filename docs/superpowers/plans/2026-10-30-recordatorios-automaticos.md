# Recordatorios automáticos: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el envío manual de recordatorios por un motor automático simulado.

**Architecture:** Un motor de TypeScript puro (`runReminderCycle`) recibe el estado, la hora y una interfaz de envío, y devuelve el estado nuevo. `PracticeWorkspace` lo ejecuta al hidratar, cada minuto y al adelantar el reloj de demo. Las vistas solo leen el resultado.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.7, Tailwind 4, pnpm, Vitest (nuevo).

**Spec:** `docs/superpowers/specs/2026-10-30-recordatorios-automaticos-design.md`

**Prerrequisitos, ya resueltos fuera de este plan:** `CLAUDE.md` y la skill `marca-consultorio`.

## Global Constraints

- Zona horaria de todo cálculo: `America/Argentina/Buenos_Aires` (`-03:00`).
- Umbrales: 48 h, 24 h, 20 h, 12 h y 4 h, como en la sección 4 de la spec. Comparaciones con `≤`.
- La app nunca cancela ni mueve un turno por su cuenta.
- Ningún mensaje saliente a pacientes sin `whatsappConsent`.
- Mensajes sin información clínica; textos exactos en la sección 4 de la spec.
- Interfaz en español rioplatense, con "turno" y nunca "cita". Debe quedar claro que los mensajes son simulados.
- No tocar el flujo de seguimientos más allá de lo que indica cada tarea.
- Si un resultado no cumple un criterio, se corrige primero la spec.

## Review Focus

1. Reprogramar un turno a 4 horas o menos: el ciclo reinicia y debe pasar a "Hay que llamar" con motivo "Turno muy cercano". Test en Tarea 1.
2. Adelantar el reloj más allá del turno: no sale ningún mensaje y el turno deja de figurar en "Hay que llamar". Test en Tarea 1.
3. Paciente en "Hay que llamar" que responde: sale de la lista y no recibe más mensajes. Test en Tarea 1.
4. Paciente con dos turnos: cada turno tiene su propio ciclo, sin afectarse entre sí. Test en Tarea 1.
5. localStorage con la forma vieja o corrupto: se ignora y se cargan los datos de ejemplo sin romper la pantalla. Test en Tarea 2.

---

### Task 1: Motor de recordatorios

**Files:**
- Modify: `package.json` (script `"test": "vitest run"`, dependencia de desarrollo `vitest`)
- Modify: `CLAUDE.md` (secciones Comandos y Tests)
- Modify: `components/practice/types.ts`
- Create: `components/practice/reminder-engine.ts`
- Create: `components/practice/reminder-engine.test.ts`

**Interfaces:**
- Produces, en `types.ts`:

```ts
export type ReminderStep = "first" | "second"
export type ReminderAttempt = { step: ReminderStep; at: string; result: "delivered" | "failed" }
export type CallReason = "no-consent" | "too-soon" | "no-response" | "undelivered"
// Appointment suma: reminderAttempts: ReminderAttempt[]; callReason?: CallReason
// DemoState suma: clockOffsetMs: number
```

- Produces, en `reminder-engine.ts`:

```ts
export type OutboundReminder = { appointmentId: string; patientId: string; step: ReminderStep; text: string }
export type ReminderGateway = { send(message: OutboundReminder): "delivered" | "failed" }
export type PatientResponse = "confirmed" | "reschedule" | "cancel"
export const callReasonLabels: Record<CallReason, string>
export function getAppointmentTime(appointment: Appointment): number
export function isEligible(appointment: Appointment, nowMs: number): boolean
export function runReminderCycle(state: DemoState, now: string, gateway: ReminderGateway): DemoState
export function applyPatientResponse(appointment: Appointment, response: PatientResponse): Appointment
export function resetReminderCycle(appointment: Appointment, date: string, time: string): Appointment
export function getCallList(state: DemoState, nowMs: number): Appointment[]
export function getRequests(state: DemoState): Appointment[]
export function getReminderSummary(state: DemoState, todayKey: string, nowMs: number): { sent: number; confirmed: number; noResponse: number }
```

- [ ] **Step 1: Instalar Vitest y agregar el script `test`**

Run: `pnpm add -D vitest`
Expected: `package.json` lo incluye en `devDependencies`. Actualizar `CLAUDE.md`: agregar `pnpm test` a Comandos y reemplazar la sección Tests, que dice que todavía no hay runner.

- [ ] **Step 2: Agregar los tipos**

Suma los campos de arriba. Hasta la Tarea 2, `demo-data.ts` y `practice-workspace.tsx` pueden dar errores de tipos; se resuelven ahí.

- [ ] **Step 3: Escribir los tests que fallan**

Helpers del test: un `gateway` que siempre entrega, uno que siempre falla, y un armador de estado con un paciente y un turno a `T` horas de un `now` fijo. Casos en `describe("runReminderCycle")`:

```ts
it("envía el primero con T = 48 h exactas y no con T = 48 h 1 min")
it("usa el texto exacto de la spec y no agrega datos clínicos")
it("sin autorización marca no-consent con T ≤ 48 h y no registra saliente")
it("con T = 4 h sin envíos marca too-soon y no envía")
it("con T = 19 h y último entregado hace 4 h marca no-response")
it("con T = 19 h y último entregado hace 3 h 59 min no marca nada")
it("envía el segundo con T = 24 h si el primero se entregó hace 12 h")
it("no envía el segundo si el primero se entregó hace 11 h 59 min")
it("reintenta en el ciclo siguiente y marca undelivered al fallar otra vez")
it("el reintento tiene prioridad sobre too-soon y no-response")
it("un primer recordatorio agotado no genera un tercer intento")
it("el segundo fallido dos veces marca undelivered")
it("10 ciclos con la misma hora dejan un solo recordatorio y no reintentan")
it("no envía el segundo si el paciente confirmó")
it("en Hay que llamar no recibe más mensajes")
it("cada intento y cada pase a Hay que llamar quedan en communications")
// Review Focus
it("reprogramar a T ≤ 4 h reinicia el ciclo y marca too-soon")
it("con el turno vencido no envía y getCallList no lo devuelve")
it("si responde desde Hay que llamar, sale de la lista")
it("dos turnos del mismo paciente siguen ciclos independientes")
```

Y en `describe("respuestas")`:

```ts
it("reschedule y cancel mantienen fecha, hora y state, y aparecen en getRequests")
it("resetReminderCycle vacía reminderAttempts, quita callReason y deja confirmation pending")
```

- [ ] **Step 4: Ejecutar y ver que fallan**

Run: `pnpm test`
Expected: FAIL porque `reminder-engine` no existe.

- [ ] **Step 5: Implementar `reminder-engine.ts`**

Decisiones que el implementador debe respetar:
- `getAppointmentTime` usa `Date.parse(`${date}T${time}:00-03:00`)`.
- `runReminderCycle` es pura y no genera aleatorios: la actualización de estado de React puede ejecutarse dos veces.
- IDs deterministas: `${appointmentId}-${step}-${número de intento}` para mensajes y `${appointmentId}-call-${nowMs}` para pases a la lista.
- Solo se reintenta si el último intento fallido tiene `at` anterior a `now`. Eso mantiene la idempotencia con la misma hora.
- Un paso admite como máximo 2 intentos.
- Las reglas se evalúan en el orden de la spec y se aplica la primera que corresponda.
- Cada intento actualiza también `reminder` y `reminderSentAt`, para los badges existentes.
- Texto del pase a la lista: `Pasó a "Hay que llamar": {motivo}.`, como comunicación `system`, `contact`, `logged`.
- Motivos: "Sin autorización de WhatsApp", "Turno muy cercano", "No respondió", "No se pudo entregar".
- El día del mensaje sale de `formatRelativeDate` con el `todayKey` de `now`, calculado con `getDateKeyInArgentina`.
- `getCallList` ordena por turno más cercano y exige `isEligible`.
- `applyPatientResponse` quita `callReason`.
- `getReminderSummary`: `sent` cuenta los salientes de tipo `reminder` entregados con fecha `todayKey`; `confirmed`, los turnos en agenda confirmados con algún intento; `noResponse`, los elegibles con un intento entregado.

- [ ] **Step 6: Ejecutar y ver que pasan**

Run: `pnpm test`
Expected: PASS en todos los casos.

- [ ] **Step 7: Commit**

```bash
git add CLAUDE.md package.json pnpm-lock.yaml components/practice/types.ts components/practice/reminder-engine.ts components/practice/reminder-engine.test.ts
git commit -m "feat: add reminder engine"
```

### Task 2: Envío de demo y datos de ejemplo

**Files:**
- Create: `components/practice/demo-gateway.ts`
- Modify: `components/practice/demo-data.ts`
- Create: `components/practice/demo-data.test.ts`

**Interfaces:**
- Consumes: `ReminderGateway`, `runReminderCycle`, `getCallList`.
- Produces:

```ts
export const demoGateway: ReminderGateway // en demo-gateway.ts; falla solo para p-pedro
export function createDemoState(today: string, now: string): DemoState
export function isDemoState(value: unknown): value is DemoState // movida desde practice-workspace; exige clockOffsetMs numérico y reminderAttempts en cada turno
```

- [ ] **Step 1: Escribir los tests que fallan**

Para `now` en `00:30`, `09:00`, `18:45` y `23:30` hora argentina:

```ts
it("tras un ciclo aparecen los 4 motivos en getCallList")
it("tras un ciclo hay al menos un primer y un segundo recordatorio entregados")
it("hay un turno en getRequests")
it("ningún recordatorio ni intento tiene fecha futura")
it("los pacientes sin autorización no tienen salientes")
// Review Focus
it("isDemoState rechaza estado sin clockOffsetMs, null y objetos parciales")
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `pnpm test`
Expected: FAIL en `demo-data.test.ts`.

- [ ] **Step 3: Implementar `demo-gateway.ts` y actualizar `createDemoState`**

Agregar `slotAhead(now: string, hours: number): { date: string; time: string }`, que redondea hacia arriba a la media hora. Es necesario porque un caso que depende de `T` no puede atarse a una fecha fija. Los turnos cercanos pueden caer fuera del horario del consultorio si la demo se abre de noche: es aceptable.

Casos fijos, todos con `reminderAttempts: []` salvo que se indique:

| Turno | Fecha y hora | Estado | Caso |
|---|---|---|---|
| `apt-maria` | mañana 09:00 | pendiente, sin envíos | Primer recordatorio |
| `apt-juan` | mañana 10:30 | `reschedule-requested`, primero entregado hace 26 h | Solicitud |
| `apt-pedro` | mañana 15:00 | pendiente, primer intento fallido hace 1 h | "No se pudo entregar" |
| `apt-tomas` | mañana 12:30 | pendiente, en agenda (`p-tomas` sin autorización) | "Sin autorización" |
| `apt-andres` | `slotAhead(now, 10)` | primero hace 30 h y segundo hace 5 h, entregados | "No respondió" |
| `apt-nicolas` | `slotAhead(now, 2)` | pendiente, sin envíos | "Turno muy cercano" |
| `apt-valentina` | `slotAhead(now, 22)` | primero entregado hace 14 h | Segundo recordatorio |
| `apt-mateo` | hoy + 2 | `cancelled`, sin envíos | Turno cancelado |

Además:
- `apt-carla` queda confirmado, con el primero entregado, para que `fu-carla` no cambie.
- `apt-sofia`, a hoy + 2, queda pendiente y sin envíos.
- Los turnos pasados conservan su asistencia.
- `apt-bruno-next` queda pendiente y sin envíos, sin la fecha futura actual.
- Las comunicaciones de ejemplo coinciden con estos intentos, incluidos los textos de la spec.

- [ ] **Step 4: Ejecutar y ver que pasan**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/practice/demo-gateway.ts components/practice/demo-data.ts components/practice/demo-data.test.ts
git commit -m "feat: add demo gateway and reminder seed data"
```

### Task 3: Motor y reloj de demo en el workspace

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/practice/practice-workspace.tsx`
- Create: `components/practice/demo-clock.tsx`

**Interfaces:**
- Consumes: `runReminderCycle`, `applyPatientResponse`, `resetReminderCycle`, `demoGateway`, `isDemoState`, `createDemoState`.
- Produces:

```ts
// PracticeWorkspace recibe además: nowIso: string (hora real del servidor)
export function DemoClock(props: { now: string; onAdvance: (hours: 1 | 6 | 24) => void }): JSX.Element
```

- [ ] **Step 1: Pasar la hora al workspace**

`page.tsx` envía `nowIso={now.toISOString()}`.

- [ ] **Step 2: Agregar el reloj**

En `PracticeWorkspace`:
- Estado `realNow`, iniciado con `nowIso` para no romper la hidratación y actualizado cada 60 segundos.
- Derivados: `now = realNow + data.clockOffsetMs`, `todayKey = getDateKeyInArgentina(new Date(now))` y el saludo con `getGreetingInArgentina`.
- La prop actual pasa a llamarse `realTodayKey` y solo se usa para la clave de storage.
- Clave de storage: `dra-laura-agenda-demo-v2-${realTodayKey}`.
- Todos los `new Date().toISOString()` del archivo pasan a usar `now`, para que el historial sea coherente con el reloj de demo.

- [ ] **Step 3: Ejecutar el motor**

Un efecto con `[hasHydrated, nowMs]` hace `setData((current) => runReminderCycle(current, nowIso, demoGateway))`. No corre antes de hidratar, para no pisar lo guardado en localStorage.

- [ ] **Step 4: Actualizar las acciones**

- `recordAppointmentResponse` usa `applyPatientResponse` y acepta solo `PatientResponse`.
- `saveReschedule` usa `resetReminderCycle`.
- `confirmAppointment` y `cancelAppointment` quitan `callReason`.
- Se eliminan `sendAppointmentReminder` y su paso a `SendWhatsAppDialog`.
- `resetDemo` usa la hora real, con lo que el offset vuelve a 0.

- [ ] **Step 5: Crear `DemoClock` y ubicarlo en el encabezado**

Muestra día y hora simulados con la etiqueta "Reloj de demo", y botones `+1 h`, `+6 h` y `+24 h` con `aria-label` claros. Debe entrar en el ancho de un teléfono.

- [ ] **Step 6: Verificar**

Run: `pnpm test && pnpm exec tsc --noEmit`
Expected: los tests pasan. Solo pueden quedar errores por props que se ajustan en las tareas 4 y 5; anotarlos.

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx components/practice/practice-workspace.tsx components/practice/demo-clock.tsx
git commit -m "feat: run reminder cycles on a demo clock"
```

### Task 4: Inicio

Usar la skill `marca-consultorio`.

**Files:**
- Create: `components/practice/reminder-panels.tsx`
- Modify: `components/practice/dashboard-view.tsx`

**Interfaces:**
- Consumes: `getCallList`, `getRequests`, `getReminderSummary`, `callReasonLabels`.
- Produces:

```ts
export function ReminderSummary(props: { sent: number; confirmed: number; noResponse: number }): JSX.Element
export function CallListPanel(props: { items: Appointment[]; data: DemoState; todayKey: string; onOpenAppointment: (id: string) => void }): JSX.Element
export function RequestsPanel(props: { items: Appointment[]; data: DemoState; todayKey: string; onOpenAppointment: (id: string) => void }): JSX.Element
```

- [ ] **Step 1: Crear los paneles**

- `ReminderSummary` muestra los tres números e incluye "Mensajes simulados: no se envían por WhatsApp".
- `CallListPanel` muestra paciente, teléfono, día, hora, motivo y acceso al detalle, sin límite de filas. Título: "Hay que llamar". Vacío: "No hay nadie para llamar".
- `RequestsPanel` muestra el pedido con el badge existente. Título: "Solicitudes". Vacío: "No hay solicitudes pendientes".

- [ ] **Step 2: Actualizar `dashboard-view.tsx`**

- Colocar los tres componentes antes de "Necesitan tu atención".
- `getAttentionItems` queda solo con seguimientos: se quitan las ramas de turnos, `onSendReminder` y `kind: "reminder"`.
- `DashboardView` recibe `now: number`.

- [ ] **Step 3: Verificar**

Run: `pnpm test && pnpm exec tsc --noEmit`
Expected: sin errores en `dashboard-view.tsx` ni `reminder-panels.tsx`.

- [ ] **Step 4: Commit**

```bash
git add components/practice/reminder-panels.tsx components/practice/dashboard-view.tsx
git commit -m "feat: show call list and requests on the dashboard"
```

### Task 5: Turnos y detalle

Usar la skill `marca-consultorio`.

**Files:**
- Modify: `components/practice/appointments-view.tsx`
- Modify: `components/practice/detail-drawer.tsx`
- Modify: `components/practice/interaction-dialogs.tsx`
- Modify: `components/practice/practice-workspace.tsx` (props)

**Interfaces:**
- Consumes: `callReasonLabels`, `isEligible`, `PatientResponse`.
- Produces:

```ts
export type MessageTarget = { kind: "follow-up"; id: string } | null
// DetailDrawer: quita onSendMessage para turnos; suma onSimulateResponse: (id: string, response: PatientResponse) => void y now: number
// AppointmentsView: quita onSendReminder; suma now: number
```

- [ ] **Step 1: Actualizar `appointments-view.tsx`**

Quitar el botón de recordatorio, `onSendReminder` e `isSendable`. Agregar el filtro `"call"`, con la etiqueta "Hay que llamar". Cuando corresponda, mostrar el motivo en la tarjeta. Mantener el aviso de WhatsApp deshabilitado.

- [ ] **Step 2: Actualizar `detail-drawer.tsx`**

- Quitar los botones "Enviar recordatorio" y "Reintentar recordatorio" en turno y paciente.
- Agregar el paso actual ("Primer recordatorio entregado", etc.) y el motivo de "Hay que llamar".
- Agregar "Simular respuesta del paciente" con Confirmar, Necesito reprogramar y Solicitar cancelar. Solo es visible con `isEligible` y al menos un intento entregado.
- Etiquetar ese bloque y el historial como simulados.

- [ ] **Step 3: Simplificar `SendWhatsAppDialog`**

Dejarlo solo para seguimientos: quitar la rama de turno y sus respuestas simuladas. El texto y las acciones de seguimiento no cambian.

- [ ] **Step 4: Verificar**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm build`
Expected: todo sin errores.

Run: `git grep -n -E "Enviar recordatorio|Reintentar recordatorio|onSendReminder|sendAppointmentReminder" -- components`
Expected: sin resultados.

- [ ] **Step 5: Commit**

```bash
git add components/practice
git commit -m "feat: remove manual reminders and add simulated responses"
```

### Task 6: Verificación de los criterios en el navegador

**Files:**
- Modify: la spec, solo si un criterio no se cumple

- [ ] **Step 1: Levantar la app**

Run: `pnpm dev`
Expected: `http://localhost:3000` responde. Usar la skill `run` o `webapp-testing`, con el storage limpio.

- [ ] **Step 2: Recorrer los criterios**

- **CA1:** abrir sin clics; el historial de María tiene el primer recordatorio.
- **CA2:** recargar varias veces, sin duplicados. Confirmar a un paciente, adelantar el reloj hasta su turno y comprobar que no recibe el segundo.
- **CA3:** en Inicio se ven Tomás, Andrés y Pedro, cada uno con su motivo, y Tomás no tiene salientes.
- **CA4:** Juan está en "Solicitudes" con fecha intacta; al reprogramarlo, el ciclo empieza de nuevo.
- **CA5:** no hay envío manual en ninguna pantalla y se indica que los mensajes son simulados.
- **Además:** revisar con ancho de 375 px, sin scroll horizontal, y recargar con estado corrupto en localStorage.

- [ ] **Step 3: Si algo falla**

Corregir primero la spec si el criterio estaba mal definido, y después el código, con un test que reproduzca el fallo.

- [ ] **Step 4: Verificación final**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm build`
Expected: todo sin errores.

- [ ] **Step 5: Commit, solo si hubo cambios**

```bash
git add -A
git commit -m "fix: align reminders with acceptance criteria"
```
