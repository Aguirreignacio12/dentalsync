import { formatRelativeDate, getDateKeyInArgentina, getFirstName } from "./formatters"
import type { Appointment, CallReason, Communication, DemoState, Patient, ReminderStep } from "./types"

const HOUR = 3_600_000
const FIRST_REMINDER_WINDOW = 48 * HOUR
const SECOND_REMINDER_WINDOW = 24 * HOUR
const NO_RESPONSE_WINDOW = 20 * HOUR
const TOO_SOON_WINDOW = 4 * HOUR
const NO_RESPONSE_WAIT = 4 * HOUR
const MIN_GAP_BETWEEN_REMINDERS = 12 * HOUR
const MAX_ATTEMPTS_PER_STEP = 2

export type OutboundReminder = { appointmentId: string; patientId: string; step: ReminderStep; text: string }
export type ReminderGateway = { send(message: OutboundReminder): "delivered" | "failed" }
export type PatientResponse = "confirmed" | "reschedule" | "cancel"

export const callReasonLabels: Record<CallReason, string> = {
  "no-consent": "Sin autorización de WhatsApp",
  "too-soon": "Turno muy cercano",
  "no-response": "No respondió",
  undelivered: "No se pudo entregar",
}

export function getAppointmentTime(appointment: Appointment) {
  return Date.parse(`${appointment.date}T${appointment.time}:00-03:00`)
}

export function isEligible(appointment: Appointment, nowMs: number) {
  return appointment.state === "scheduled"
    && appointment.attendance === "unknown"
    && appointment.confirmation === "pending"
    && getAppointmentTime(appointment) > nowMs
}

function buildReminderText(step: ReminderStep, patient: Patient, appointment: Appointment, todayKey: string) {
  const name = getFirstName(patient.name)
  const day = formatRelativeDate(appointment.date, todayKey)
  const options = "Respondé 1 para confirmar, 2 para reprogramar o 3 para cancelar."
  return step === "first"
    ? `Hola ${name}, te recordamos tu turno en el consultorio de la Dra. Laura para ${day} a las ${appointment.time}. ${options}`
    : `Hola ${name}, todavía no recibimos tu confirmación para el turno de ${day} a las ${appointment.time}. ${options}`
}

function evaluateAppointment(
  appointment: Appointment,
  patient: Patient,
  now: string,
  gateway: ReminderGateway,
): { appointment: Appointment; communications: Communication[] } {
  const nowMs = Date.parse(now)
  const unchanged = { appointment, communications: [] }

  if (!isEligible(appointment, nowMs) || appointment.callReason) return unchanged

  const timeLeft = getAppointmentTime(appointment) - nowMs
  const attempts = appointment.reminderAttempts
  const lastAttempt = attempts.at(-1)

  function markForCall(current: Appointment, reason: CallReason, communications: Communication[] = []) {
    const log: Communication = {
      id: `${current.id}-call-${nowMs}`,
      patientId: current.patientId,
      appointmentId: current.id,
      direction: "system",
      kind: "contact",
      text: `Pasó a "Hay que llamar": ${callReasonLabels[reason]}.`,
      status: "logged",
      at: now,
    }
    return { appointment: { ...current, callReason: reason }, communications: [log, ...communications] }
  }

  function sendReminder(step: ReminderStep) {
    const attemptNumber = attempts.filter((attempt) => attempt.step === step).length + 1
    const text = buildReminderText(step, patient, appointment, getDateKeyInArgentina(new Date(now)))
    const result = gateway.send({ appointmentId: appointment.id, patientId: appointment.patientId, step, text })
    const communication: Communication = {
      id: `${appointment.id}-${step}-${attemptNumber}-${nowMs}`,
      patientId: appointment.patientId,
      appointmentId: appointment.id,
      direction: "outbound",
      kind: "reminder",
      text,
      status: result,
      at: now,
    }
    const updated: Appointment = {
      ...appointment,
      reminder: result,
      reminderSentAt: now,
      reminderAttempts: [...attempts, { step, at: now, result }],
    }
    return result === "failed" && attemptNumber === MAX_ATTEMPTS_PER_STEP
      ? markForCall(updated, "undelivered", [communication])
      : { appointment: updated, communications: [communication] }
  }

  if (!patient.whatsappConsent) {
    return timeLeft <= FIRST_REMINDER_WINDOW ? markForCall(appointment, "no-consent") : unchanged
  }

  if (lastAttempt?.result === "failed") {
    const stepAttempts = attempts.filter((attempt) => attempt.step === lastAttempt.step).length
    if (stepAttempts >= MAX_ATTEMPTS_PER_STEP) return markForCall(appointment, "undelivered")
    return Date.parse(lastAttempt.at) < nowMs ? sendReminder(lastAttempt.step) : unchanged
  }

  if (!lastAttempt) {
    if (timeLeft > FIRST_REMINDER_WINDOW) return unchanged
    return timeLeft <= TOO_SOON_WINDOW ? markForCall(appointment, "too-soon") : sendReminder("first")
  }

  if (timeLeft <= NO_RESPONSE_WINDOW && nowMs - Date.parse(lastAttempt.at) >= NO_RESPONSE_WAIT) {
    return markForCall(appointment, "no-response")
  }

  const firstDelivered = attempts.find((attempt) => attempt.step === "first" && attempt.result === "delivered")
  const secondAttempted = attempts.some((attempt) => attempt.step === "second")
  if (
    timeLeft <= SECOND_REMINDER_WINDOW
    && firstDelivered
    && !secondAttempted
    && nowMs - Date.parse(firstDelivered.at) >= MIN_GAP_BETWEEN_REMINDERS
  ) {
    return sendReminder("second")
  }

  return unchanged
}

export function runReminderCycle(state: DemoState, now: string, gateway: ReminderGateway): DemoState {
  const patientById = new Map(state.patients.map((patient) => [patient.id, patient]))
  const communications: Communication[] = []
  const appointments = state.appointments.map((appointment) => {
    const patient = patientById.get(appointment.patientId)
    if (!patient) return appointment
    const result = evaluateAppointment(appointment, patient, now, gateway)
    communications.push(...result.communications)
    return result.appointment
  })

  if (!communications.length) return state
  return { ...state, appointments, communications: [...communications, ...state.communications] }
}

export function applyPatientResponse(appointment: Appointment, response: PatientResponse): Appointment {
  const confirmation = {
    confirmed: "confirmed",
    reschedule: "reschedule-requested",
    cancel: "cancel-requested",
  } as const
  return { ...appointment, confirmation: confirmation[response], callReason: undefined }
}

export function resetReminderCycle(appointment: Appointment, date: string, time: string): Appointment {
  return {
    ...appointment,
    date,
    time,
    state: "scheduled",
    confirmation: "pending",
    attendance: "unknown",
    reminder: "not-sent",
    reminderSentAt: undefined,
    reminderAttempts: [],
    callReason: undefined,
  }
}

function byAppointmentTime(a: Appointment, b: Appointment) {
  return getAppointmentTime(a) - getAppointmentTime(b)
}

export function getCallList(state: DemoState, nowMs: number) {
  return state.appointments
    .filter((appointment) => appointment.callReason && isEligible(appointment, nowMs))
    .sort(byAppointmentTime)
}

export function getRequests(state: DemoState) {
  return state.appointments
    .filter((appointment) => appointment.state === "scheduled"
      && appointment.attendance === "unknown"
      && (appointment.confirmation === "reschedule-requested" || appointment.confirmation === "cancel-requested"))
    .sort(byAppointmentTime)
}

export function getReminderSummary(state: DemoState, todayKey: string, nowMs: number) {
  return {
    sent: state.communications.filter((item) => item.direction === "outbound"
      && item.kind === "reminder"
      && item.status === "delivered"
      && getDateKeyInArgentina(new Date(item.at)) === todayKey).length,
    confirmed: state.appointments.filter((item) => item.state === "scheduled"
      && item.confirmation === "confirmed"
      && item.reminderAttempts.length > 0).length,
    noResponse: state.appointments.filter((item) => isEligible(item, nowMs)
      && item.reminderAttempts.some((attempt) => attempt.result === "delivered")).length,
  }
}
