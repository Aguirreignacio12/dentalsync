import { describe, expect, it } from "vitest"
import {
  applyPatientResponse,
  getCallList,
  getRequests,
  getReminderSummary,
  isEligible,
  resetReminderCycle,
  runReminderCycle,
  type ReminderGateway,
} from "./reminder-engine"
import type { Appointment, DemoState, ReminderAttempt } from "./types"

const HOUR = 3_600_000
const MINUTE = 60_000
const NOW = "2026-11-03T13:00:00.000Z" // 10:00 en Argentina
const nowMs = Date.parse(NOW)

const delivers: ReminderGateway = { send: () => "delivered" }
const fails: ReminderGateway = { send: () => "failed" }

function isoAgo(ms: number) {
  return new Date(nowMs - ms).toISOString()
}

function slotIn(ms: number) {
  const local = new Date(nowMs + ms - 3 * HOUR).toISOString()
  return { date: local.slice(0, 10), time: local.slice(11, 16) }
}

function appointment(ms: number, overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: "apt-1",
    patientId: "p-1",
    ...slotIn(ms),
    confirmation: "pending",
    state: "scheduled",
    attendance: "unknown",
    reminder: "not-sent",
    reminderAttempts: [],
    ...overrides,
  }
}

function stateWith(appointments: Appointment[], whatsappConsent = true): DemoState {
  return {
    patients: [{ id: "p-1", name: "María González", phone: "+54 9 11 0000-0000", whatsappConsent }],
    appointments,
    followUps: [],
    communications: [],
    clockOffsetMs: 0,
  }
}

function delivered(step: ReminderAttempt["step"], ago: number): ReminderAttempt {
  return { step, at: isoAgo(ago), result: "delivered" }
}

function failed(step: ReminderAttempt["step"], ago: number): ReminderAttempt {
  return { step, at: isoAgo(ago), result: "failed" }
}

const outbound = (state: DemoState) => state.communications.filter((item) => item.direction === "outbound")

describe("runReminderCycle", () => {
  it("envía el primero con T = 48 h exactas y no con T = 48 h 1 min", () => {
    const due = runReminderCycle(stateWith([appointment(48 * HOUR)]), NOW, delivers)
    const early = runReminderCycle(stateWith([appointment(48 * HOUR + MINUTE)]), NOW, delivers)

    expect(due.appointments[0].reminderAttempts).toEqual([{ step: "first", at: NOW, result: "delivered" }])
    expect(early.appointments[0].reminderAttempts).toEqual([])
  })

  it("usa el texto exacto de la spec y no agrega datos clínicos", () => {
    const first = runReminderCycle(stateWith([appointment(24 * HOUR)]), NOW, delivers)
    expect(outbound(first)[0].text).toBe("Hola María, te recordamos tu turno en el consultorio de la Dra. Laura para mañana a las 10:00. Respondé 1 para confirmar, 2 para reprogramar o 3 para cancelar.")

    const second = runReminderCycle(stateWith([appointment(22 * HOUR, { reminderAttempts: [delivered("first", 12 * HOUR)] })]), NOW, delivers)
    expect(outbound(second)[0].text).toBe("Hola María, todavía no recibimos tu confirmación para el turno de mañana a las 08:00. Respondé 1 para confirmar, 2 para reprogramar o 3 para cancelar.")
  })

  it("sin autorización marca no-consent con T ≤ 48 h y no registra saliente", () => {
    const result = runReminderCycle(stateWith([appointment(48 * HOUR)], false), NOW, delivers)

    expect(result.appointments[0].callReason).toBe("no-consent")
    expect(outbound(result)).toEqual([])
  })

  it("sin autorización y con T > 48 h no hace nada", () => {
    const result = runReminderCycle(stateWith([appointment(49 * HOUR)], false), NOW, delivers)

    expect(result.appointments[0].callReason).toBeUndefined()
  })

  it("con T = 4 h sin envíos marca too-soon y no envía", () => {
    const result = runReminderCycle(stateWith([appointment(4 * HOUR)]), NOW, delivers)

    expect(result.appointments[0].callReason).toBe("too-soon")
    expect(outbound(result)).toEqual([])
  })

  it("con T = 19 h y último entregado hace 4 h marca no-response", () => {
    const result = runReminderCycle(stateWith([appointment(19 * HOUR, { reminderAttempts: [delivered("first", 20 * HOUR), delivered("second", 4 * HOUR)] })]), NOW, delivers)

    expect(result.appointments[0].callReason).toBe("no-response")
  })

  it("con T = 19 h y último entregado hace 3 h 59 min no marca nada", () => {
    const result = runReminderCycle(stateWith([appointment(19 * HOUR, { reminderAttempts: [delivered("first", 20 * HOUR), delivered("second", 4 * HOUR - MINUTE)] })]), NOW, delivers)

    expect(result.appointments[0].callReason).toBeUndefined()
  })

  it("envía el segundo con T = 24 h si el primero se entregó hace 12 h", () => {
    const result = runReminderCycle(stateWith([appointment(24 * HOUR, { reminderAttempts: [delivered("first", 12 * HOUR)] })]), NOW, delivers)

    expect(result.appointments[0].reminderAttempts.at(-1)).toEqual({ step: "second", at: NOW, result: "delivered" })
  })

  it("no envía el segundo si el primero se entregó hace 11 h 59 min", () => {
    const result = runReminderCycle(stateWith([appointment(24 * HOUR, { reminderAttempts: [delivered("first", 12 * HOUR - MINUTE)] })]), NOW, delivers)

    expect(result.appointments[0].reminderAttempts).toHaveLength(1)
  })

  it("reintenta en el ciclo siguiente y marca undelivered al fallar otra vez", () => {
    const afterFirst = runReminderCycle(stateWith([appointment(30 * HOUR)]), NOW, fails)
    expect(afterFirst.appointments[0].callReason).toBeUndefined()

    const later = new Date(nowMs + MINUTE).toISOString()
    const afterRetry = runReminderCycle(afterFirst, later, fails)

    expect(afterRetry.appointments[0].reminderAttempts).toHaveLength(2)
    expect(afterRetry.appointments[0].callReason).toBe("undelivered")
  })

  it("el reintento tiene prioridad sobre too-soon y no-response", () => {
    const close = runReminderCycle(stateWith([appointment(3 * HOUR, { reminderAttempts: [failed("first", HOUR)] })]), NOW, delivers)
    const silent = runReminderCycle(stateWith([appointment(15 * HOUR, { reminderAttempts: [delivered("first", 20 * HOUR), failed("second", 6 * HOUR)] })]), NOW, delivers)

    expect(close.appointments[0].reminderAttempts.at(-1)).toEqual({ step: "first", at: NOW, result: "delivered" })
    expect(close.appointments[0].callReason).toBeUndefined()
    expect(silent.appointments[0].reminderAttempts.at(-1)).toEqual({ step: "second", at: NOW, result: "delivered" })
    expect(silent.appointments[0].callReason).toBeUndefined()
  })

  it("un primer recordatorio agotado no genera un tercer intento", () => {
    const exhausted = stateWith([appointment(30 * HOUR, { reminderAttempts: [failed("first", 2 * HOUR), failed("first", HOUR)], callReason: "undelivered" })])

    const result = runReminderCycle(exhausted, NOW, delivers)

    expect(result.appointments[0].reminderAttempts).toHaveLength(2)
    expect(outbound(result)).toEqual([])
  })

  it("el segundo fallido dos veces marca undelivered", () => {
    const result = runReminderCycle(stateWith([appointment(21 * HOUR, { reminderAttempts: [delivered("first", 20 * HOUR), failed("second", HOUR)] })]), NOW, fails)

    expect(result.appointments[0].callReason).toBe("undelivered")
  })

  it("10 ciclos con la misma hora dejan un solo recordatorio y no reintentan", () => {
    let sent = stateWith([appointment(30 * HOUR)])
    let failing = stateWith([appointment(30 * HOUR)])
    for (let cycle = 0; cycle < 10; cycle += 1) {
      sent = runReminderCycle(sent, NOW, delivers)
      failing = runReminderCycle(failing, NOW, fails)
    }

    expect(outbound(sent)).toHaveLength(1)
    expect(sent.appointments[0].reminderAttempts).toHaveLength(1)
    expect(failing.appointments[0].reminderAttempts).toHaveLength(1)
  })

  it("no envía el segundo si el paciente confirmó", () => {
    const sent = runReminderCycle(stateWith([appointment(30 * HOUR)]), NOW, delivers)
    const confirmed = { ...sent, appointments: sent.appointments.map((item) => applyPatientResponse(item, "confirmed")) }

    const later = new Date(nowMs + 20 * HOUR).toISOString()
    const result = runReminderCycle(confirmed, later, delivers)

    expect(outbound(result)).toHaveLength(1)
  })

  it("en Hay que llamar no recibe más mensajes", () => {
    const result = runReminderCycle(stateWith([appointment(22 * HOUR, { reminderAttempts: [delivered("first", 12 * HOUR)], callReason: "no-response" })]), NOW, delivers)

    expect(outbound(result)).toEqual([])
  })

  it("cada intento y cada pase a Hay que llamar quedan en communications", () => {
    const afterFirst = runReminderCycle(stateWith([appointment(30 * HOUR)]), NOW, fails)
    const afterRetry = runReminderCycle(afterFirst, new Date(nowMs + MINUTE).toISOString(), fails)

    expect(outbound(afterRetry).map((item) => item.status)).toEqual(["failed", "failed"])
    const log = afterRetry.communications.find((item) => item.direction === "system")
    expect(log?.text).toBe('Pasó a "Hay que llamar": No se pudo entregar.')
    expect(new Set(afterRetry.communications.map((item) => item.id)).size).toBe(3)
  })

  it("reprogramar a T ≤ 4 h reinicia el ciclo y marca too-soon", () => {
    const original = appointment(19 * HOUR, { reminderAttempts: [delivered("first", 20 * HOUR)], callReason: "no-response" })
    const { date, time } = slotIn(3 * HOUR)

    const result = runReminderCycle(stateWith([resetReminderCycle(original, date, time)]), NOW, delivers)

    expect(result.appointments[0].callReason).toBe("too-soon")
    expect(result.appointments[0].reminderAttempts).toEqual([])
  })

  it("con el turno vencido no envía y getCallList no lo devuelve", () => {
    const flagged = appointment(HOUR, { callReason: "too-soon" })
    const pending = appointment(2 * HOUR, { id: "apt-2" })
    const later = new Date(nowMs + 24 * HOUR).toISOString()

    const result = runReminderCycle(stateWith([flagged, pending]), later, delivers)

    expect(outbound(result)).toEqual([])
    expect(getCallList(result, Date.parse(later))).toEqual([])
  })

  it("si responde desde Hay que llamar, sale de la lista", () => {
    const flagged = appointment(10 * HOUR, { reminderAttempts: [delivered("first", 20 * HOUR)], callReason: "no-response" })
    const state = stateWith([applyPatientResponse(flagged, "confirmed")])

    expect(getCallList(state, nowMs)).toEqual([])
  })

  it("dos turnos del mismo paciente siguen ciclos independientes", () => {
    const near = appointment(30 * HOUR)
    const far = appointment(100 * HOUR, { id: "apt-2" })

    const result = runReminderCycle(stateWith([near, far]), NOW, delivers)

    expect(result.appointments.map((item) => item.reminderAttempts.length)).toEqual([1, 0])
  })

  it("no reintenta ni marca un turno que ya no es elegible", () => {
    const attended = appointment(-HOUR, { attendance: "attended", reminderAttempts: [failed("first", 2 * HOUR)] })
    const cancelled = appointment(2 * HOUR, { id: "apt-2", state: "cancelled", attendance: "cancelled" })

    const result = runReminderCycle(stateWith([attended, cancelled]), NOW, delivers)

    expect(result.communications).toEqual([])
    expect(result.appointments.every((item) => item.callReason === undefined)).toBe(true)
  })
})

describe("respuestas", () => {
  it("reschedule y cancel mantienen fecha, hora y state, y aparecen en getRequests", () => {
    const original = appointment(30 * HOUR)
    const rescheduled = applyPatientResponse(original, "reschedule")
    const cancelled = applyPatientResponse({ ...original, id: "apt-2" }, "cancel")

    expect(rescheduled).toMatchObject({ date: original.date, time: original.time, state: "scheduled", confirmation: "reschedule-requested" })
    expect(cancelled).toMatchObject({ date: original.date, time: original.time, state: "scheduled", confirmation: "cancel-requested" })
    expect(getRequests(stateWith([rescheduled, cancelled])).map((item) => item.id)).toEqual(["apt-1", "apt-2"])
  })

  it("no envía más recordatorios a quien pidió un cambio", () => {
    const requested = applyPatientResponse(appointment(22 * HOUR, { reminderAttempts: [delivered("first", 12 * HOUR)] }), "reschedule")

    const result = runReminderCycle(stateWith([requested]), NOW, delivers)

    expect(outbound(result)).toEqual([])
  })

  it("resetReminderCycle vacía reminderAttempts, quita callReason y deja confirmation pending", () => {
    const original = appointment(10 * HOUR, { confirmation: "reschedule-requested", reminder: "delivered", reminderSentAt: isoAgo(HOUR), reminderAttempts: [delivered("first", HOUR)], callReason: "no-response" })

    const result = resetReminderCycle(original, "2026-11-10", "11:30")

    expect(result).toMatchObject({ date: "2026-11-10", time: "11:30", confirmation: "pending", reminder: "not-sent", reminderAttempts: [] })
    expect(result.callReason).toBeUndefined()
    expect(result.reminderSentAt).toBeUndefined()
  })
})

describe("listas", () => {
  it("getCallList ordena por el turno más cercano", () => {
    const state = stateWith([
      appointment(10 * HOUR, { id: "later", callReason: "no-response" }),
      appointment(2 * HOUR, { id: "sooner", callReason: "too-soon" }),
    ])

    expect(getCallList(state, nowMs).map((item) => item.id)).toEqual(["sooner", "later"])
  })

  it("isEligible exige turno futuro, en agenda y pendiente", () => {
    expect(isEligible(appointment(HOUR), nowMs)).toBe(true)
    expect(isEligible(appointment(0), nowMs)).toBe(false)
    expect(isEligible(appointment(HOUR, { confirmation: "confirmed" }), nowMs)).toBe(false)
  })

  it("getReminderSummary cuenta enviados de hoy, confirmados y sin respuesta", () => {
    const sent = runReminderCycle(stateWith([appointment(30 * HOUR), appointment(40 * HOUR, { id: "apt-2" })]), NOW, delivers)
    const state = { ...sent, appointments: sent.appointments.map((item) => item.id === "apt-2" ? applyPatientResponse(item, "confirmed") : item) }

    expect(getReminderSummary(state, "2026-11-03", nowMs)).toEqual({ sent: 2, confirmed: 1, noResponse: 1 })
    expect(getReminderSummary(state, "2026-11-04", nowMs).sent).toBe(0)
  })
})
