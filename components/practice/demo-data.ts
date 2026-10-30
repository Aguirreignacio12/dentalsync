import type { Appointment, Communication, DemoState, FollowUp, Patient, ReminderAttempt, ReminderStep } from "./types"

const stamp = (date: string, time: string) => `${date}T${time}:00-03:00`

const HOUR = 3_600_000
const HALF_HOUR = HOUR / 2

export function addDays(dateKey: string, amount: number) {
  const [year, month, day] = dateKey.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day + amount)).toISOString().slice(0, 10)
}

function slotAhead(now: string, hours: number) {
  const slot = Math.ceil((Date.parse(now) + hours * HOUR) / HALF_HOUR) * HALF_HOUR
  const local = new Date(slot - 3 * HOUR).toISOString()
  return { date: local.slice(0, 10), time: local.slice(11, 16) }
}

function attempt(step: ReminderStep, at: string, result: ReminderAttempt["result"] = "delivered"): ReminderAttempt {
  return { step, at, result }
}

function reminded(attempts: ReminderAttempt[]) {
  const last = attempts[attempts.length - 1]
  return { reminder: last.result, reminderSentAt: last.at, reminderAttempts: attempts }
}

export function isDemoState(value: unknown): value is DemoState {
  if (!value || typeof value !== "object") return false
  const candidate = value as Partial<DemoState>
  return Array.isArray(candidate.patients)
    && Array.isArray(candidate.appointments)
    && candidate.appointments.every((appointment) => Array.isArray(appointment?.reminderAttempts))
    && Array.isArray(candidate.followUps)
    && Array.isArray(candidate.communications)
    && typeof candidate.clockOffsetMs === "number"
}

export function createDemoState(today: string, now: string): DemoState {
  const hoursAgo = (hours: number) => new Date(Date.parse(now) - hours * HOUR).toISOString()

  const patients: Patient[] = [
    { id: "p-maria", name: "María González", phone: "+54 9 11 4567-2381", whatsappConsent: true, consentUpdatedAt: stamp(addDays(today, -80), "10:20") },
    { id: "p-juan", name: "Juan Pérez", phone: "+54 9 11 5123-6044", whatsappConsent: true, consentUpdatedAt: stamp(addDays(today, -62), "12:15") },
    { id: "p-lucia", name: "Lucía Fernández", phone: "+54 9 11 3988-1720", whatsappConsent: true, consentUpdatedAt: stamp(addDays(today, -48), "09:10") },
    { id: "p-pedro", name: "Pedro Rodríguez", phone: "+54 9 11 6682-4017", whatsappConsent: true, consentUpdatedAt: stamp(addDays(today, -70), "16:42") },
    { id: "p-carla", name: "Carla Martínez", phone: "+54 9 11 4477-2109", whatsappConsent: true, consentUpdatedAt: stamp(addDays(today, -32), "11:04") },
    { id: "p-andres", name: "Andrés López", phone: "+54 9 11 6210-9934", whatsappConsent: true, consentUpdatedAt: stamp(addDays(today, -26), "14:31") },
    { id: "p-valentina", name: "Valentina Romero", phone: "+54 9 11 3021-7865", whatsappConsent: true, consentUpdatedAt: stamp(addDays(today, -25), "09:22") },
    { id: "p-tomas", name: "Tomás Benítez", phone: "+54 9 11 5891-3408", whatsappConsent: false },
    { id: "p-sofia", name: "Sofía Acosta", phone: "+54 9 11 4770-8215", whatsappConsent: true, consentUpdatedAt: stamp(addDays(today, -21), "13:37") },
    { id: "p-nicolas", name: "Nicolás Díaz", phone: "+54 9 11 5542-1930", whatsappConsent: true, consentUpdatedAt: stamp(addDays(today, -20), "15:18") },
    { id: "p-elena", name: "Elena Costa", phone: "+54 9 11 4312-6650", whatsappConsent: true, consentUpdatedAt: stamp(addDays(today, -17), "10:07") },
    { id: "p-bruno", name: "Bruno Ferreyra", phone: "+54 9 11 6774-2901", whatsappConsent: true, consentUpdatedAt: stamp(addDays(today, -15), "12:56") },
    { id: "p-julieta", name: "Julieta Suárez", phone: "+54 9 11 4882-5307", whatsappConsent: true, consentUpdatedAt: stamp(addDays(today, -13), "17:20") },
    { id: "p-mateo", name: "Mateo Cabrera", phone: "+54 9 11 3678-4492", whatsappConsent: false },
  ]

  const pending = { confirmation: "pending", state: "scheduled", attendance: "unknown", reminder: "not-sent", reminderAttempts: [] } as const
  const andresSlot = slotAhead(now, 10)
  const valentinaSlot = slotAhead(now, 22)

  const appointments: Appointment[] = [
    { id: "apt-maria", patientId: "p-maria", date: addDays(today, 1), time: "09:00", ...pending },
    { id: "apt-juan", patientId: "p-juan", date: addDays(today, 1), time: "10:30", ...pending, ...reminded([attempt("first", hoursAgo(26))]), confirmation: "reschedule-requested" },
    { id: "apt-carla", patientId: "p-carla", date: today, time: "12:00", confirmation: "confirmed", state: "scheduled", attendance: "unknown", ...reminded([attempt("first", stamp(addDays(today, -1), "10:10"))]) },
    { id: "apt-pedro", patientId: "p-pedro", date: addDays(today, 1), time: "15:00", ...pending, ...reminded([attempt("first", hoursAgo(1), "failed")]) },
    { id: "apt-tomas", patientId: "p-tomas", date: addDays(today, 1), time: "12:30", ...pending },
    { id: "apt-andres", patientId: "p-andres", ...andresSlot, ...pending, ...reminded([attempt("first", hoursAgo(30)), attempt("second", hoursAgo(5))]) },
    { id: "apt-nicolas", patientId: "p-nicolas", ...slotAhead(now, 2), ...pending },
    { id: "apt-valentina", patientId: "p-valentina", ...valentinaSlot, ...pending, ...reminded([attempt("first", hoursAgo(14))]) },
    { id: "apt-sofia", patientId: "p-sofia", date: addDays(today, 2), time: "10:00", ...pending },
    { id: "apt-mateo", patientId: "p-mateo", date: addDays(today, 2), time: "12:30", ...pending, state: "cancelled", attendance: "cancelled" },
    { id: "apt-elena-next", patientId: "p-elena", date: addDays(today, 5), time: "11:30", ...pending },
    { id: "apt-bruno-next", patientId: "p-bruno", date: addDays(today, 6), time: "14:00", ...pending },
    { id: "apt-lucia-last", patientId: "p-lucia", date: addDays(today, -18), time: "10:00", confirmation: "confirmed", state: "scheduled", attendance: "attended", ...reminded([attempt("first", stamp(addDays(today, -20), "10:00"))]) },
    { id: "apt-julieta-last", patientId: "p-julieta", date: addDays(today, -11), time: "15:30", confirmation: "confirmed", state: "scheduled", attendance: "attended", ...reminded([attempt("first", stamp(addDays(today, -13), "09:30"))]) },
    { id: "apt-elena-last", patientId: "p-elena", date: addDays(today, -1), time: "16:00", confirmation: "confirmed", state: "scheduled", attendance: "no-show", ...reminded([attempt("first", stamp(addDays(today, -3), "16:00"))]) },
    { id: "apt-bruno-last", patientId: "p-bruno", date: addDays(today, -2), time: "10:00", confirmation: "confirmed", state: "scheduled", attendance: "attended", ...reminded([attempt("first", stamp(addDays(today, -4), "10:00"))]) },
  ]

  const followUps: FollowUp[] = [
    {
      id: "fu-lucia",
      patientId: "p-lucia",
      lastAppointmentDate: addDays(today, -18),
      recommendedDate: addDays(today, -4),
      state: "next-session-pending",
      activities: [
        { id: "fu-lucia-created", label: "Seguimiento abierto", detail: "Indicado por la Dra. Laura", at: stamp(addDays(today, -18), "10:50"), kind: "created" },
        { id: "fu-lucia-review", label: "Revisión pendiente", detail: "Todavía no tiene una próxima sesión agendada", at: stamp(addDays(today, -1), "09:00"), kind: "contact" },
      ],
    },
    {
      id: "fu-nicolas",
      patientId: "p-nicolas",
      lastAppointmentDate: addDays(today, -12),
      recommendedDate: today,
      state: "contact-pending",
      activities: [
        { id: "fu-nicolas-created", label: "Seguimiento abierto", detail: "Indicado por la Dra. Laura", at: stamp(addDays(today, -12), "12:20"), kind: "created" },
      ],
    },
    {
      id: "fu-julieta",
      patientId: "p-julieta",
      lastAppointmentDate: addDays(today, -11),
      recommendedDate: addDays(today, -2),
      state: "waiting-response",
      activities: [
        { id: "fu-julieta-created", label: "Seguimiento abierto", detail: "Indicado por la Dra. Laura", at: stamp(addDays(today, -11), "16:00"), kind: "created" },
        { id: "fu-julieta-message", label: "Mensaje enviado", detail: "Se consultó si quería coordinar su próximo turno", at: stamp(addDays(today, -1), "11:20"), kind: "message" },
      ],
    },
    {
      id: "fu-carla",
      patientId: "p-carla",
      lastAppointmentDate: addDays(today, -9),
      recommendedDate: addDays(today, 1),
      state: "scheduled",
      nextAppointmentId: "apt-carla",
      activities: [
        { id: "fu-carla-created", label: "Seguimiento abierto", detail: "Indicado por la Dra. Laura", at: stamp(addDays(today, -9), "12:30"), kind: "created" },
        { id: "fu-carla-scheduled", label: "Próximo turno agendado", detail: "En agenda de demostración", at: stamp(addDays(today, -2), "09:45"), kind: "scheduled" },
      ],
    },
  ]

  const firstReminderText = (name: string, day: string, time: string) => `Hola ${name}, te recordamos tu turno en el consultorio de la Dra. Laura para ${day} a las ${time}. Respondé 1 para confirmar, 2 para reprogramar o 3 para cancelar.`
  const secondReminderText = (name: string, day: string, time: string) => `Hola ${name}, todavía no recibimos tu confirmación para el turno de ${day} a las ${time}. Respondé 1 para confirmar, 2 para reprogramar o 3 para cancelar.`

  const communications: Communication[] = [
    { id: "msg-juan-reminder", patientId: "p-juan", appointmentId: "apt-juan", direction: "outbound", kind: "reminder", text: firstReminderText("Juan", "mañana", "10:30"), status: "delivered", at: hoursAgo(26) },
    { id: "msg-juan-response", patientId: "p-juan", appointmentId: "apt-juan", direction: "inbound", kind: "response", text: "¿Podemos cambiar el horario?", status: "received", at: hoursAgo(25) },
    { id: "msg-carla-reminder", patientId: "p-carla", appointmentId: "apt-carla", direction: "outbound", kind: "reminder", text: firstReminderText("Carla", "hoy", "12:00"), status: "delivered", at: stamp(addDays(today, -1), "10:10") },
    { id: "msg-pedro-failed", patientId: "p-pedro", appointmentId: "apt-pedro", direction: "outbound", kind: "reminder", text: firstReminderText("Pedro", "mañana", "15:00"), status: "failed", at: hoursAgo(1) },
    { id: "msg-andres-first", patientId: "p-andres", appointmentId: "apt-andres", direction: "outbound", kind: "reminder", text: firstReminderText("Andrés", "mañana", andresSlot.time), status: "delivered", at: hoursAgo(30) },
    { id: "msg-andres-second", patientId: "p-andres", appointmentId: "apt-andres", direction: "outbound", kind: "reminder", text: secondReminderText("Andrés", "mañana", andresSlot.time), status: "delivered", at: hoursAgo(5) },
    { id: "msg-valentina-reminder", patientId: "p-valentina", appointmentId: "apt-valentina", direction: "outbound", kind: "reminder", text: firstReminderText("Valentina", "mañana", valentinaSlot.time), status: "delivered", at: hoursAgo(14) },
    { id: "msg-julieta-followup", patientId: "p-julieta", followUpId: "fu-julieta", direction: "outbound", kind: "follow-up", text: "Hola Julieta, te escribimos desde el consultorio de la Dra. Laura. Si querés coordinar tu próximo turno, respondé este mensaje y te ayudamos.", status: "delivered", at: stamp(addDays(today, -1), "11:20") },
    { id: "msg-elena-reminder", patientId: "p-elena", appointmentId: "apt-elena-last", direction: "outbound", kind: "reminder", text: firstReminderText("Elena", "ayer", "16:00"), status: "delivered", at: stamp(addDays(today, -3), "16:00") },
    { id: "msg-lucia-contact", patientId: "p-lucia", followUpId: "fu-lucia", direction: "system", kind: "contact", text: "Seguimiento indicado por la Dra. Laura. Próxima sesión pendiente de coordinar.", status: "logged", at: stamp(addDays(today, -18), "10:50") },
  ]

  return { patients, appointments, followUps, communications, clockOffsetMs: 0 }
}
