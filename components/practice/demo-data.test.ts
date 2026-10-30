import { describe, expect, it } from "vitest"
import { createDemoState, isDemoState } from "./demo-data"
import { demoGateway } from "./demo-gateway"
import { getDateKeyInArgentina } from "./formatters"
import { getCallList, getRequests, runReminderCycle } from "./reminder-engine"

const openingTimes = [
  "2026-11-03T00:30:00-03:00",
  "2026-11-03T09:00:00-03:00",
  "2026-11-03T18:45:00-03:00",
  "2026-11-03T23:30:00-03:00",
]

function freshState(now: string) {
  return createDemoState(getDateKeyInArgentina(new Date(now)), now)
}

describe.each(openingTimes)("datos de ejemplo abiertos a las %s", (rawNow) => {
  const now = new Date(rawNow).toISOString()
  const cycled = runReminderCycle(freshState(now), now, demoGateway)

  it("tras un ciclo aparecen los 4 motivos en getCallList", () => {
    const reasons = getCallList(cycled, Date.parse(now)).map((item) => item.callReason)

    expect(new Set(reasons)).toEqual(new Set(["no-consent", "too-soon", "no-response", "undelivered"]))
  })

  it("tras un ciclo hay al menos un primer y un segundo recordatorio entregados", () => {
    const sentNow = cycled.appointments.flatMap((item) => item.reminderAttempts).filter((attempt) => attempt.at === now && attempt.result === "delivered")

    expect(sentNow.map((attempt) => attempt.step)).toEqual(expect.arrayContaining(["first", "second"]))
  })

  it("hay un turno en getRequests", () => {
    expect(getRequests(cycled).map((item) => item.id)).toEqual(["apt-juan"])
  })

  it("ningún recordatorio ni intento tiene fecha futura", () => {
    const state = freshState(now)
    const moments = [
      ...state.communications.map((item) => item.at),
      ...state.appointments.flatMap((item) => item.reminderAttempts.map((attempt) => attempt.at)),
    ]

    expect(moments.filter((moment) => Date.parse(moment) > Date.parse(now))).toEqual([])
  })

  it("los pacientes sin autorización no tienen salientes", () => {
    const withoutConsent = new Set(cycled.patients.filter((patient) => !patient.whatsappConsent).map((patient) => patient.id))

    expect(cycled.communications.filter((item) => item.direction === "outbound" && withoutConsent.has(item.patientId))).toEqual([])
  })
})

describe("isDemoState", () => {
  const now = new Date(openingTimes[1]).toISOString()

  it("acepta el estado actual", () => {
    expect(isDemoState(freshState(now))).toBe(true)
  })

  it("rechaza estado sin clockOffsetMs, null y objetos parciales", () => {
    const { clockOffsetMs: _omitted, ...withoutClock } = freshState(now)

    expect(isDemoState(withoutClock)).toBe(false)
    expect(isDemoState(null)).toBe(false)
    expect(isDemoState({ patients: [] })).toBe(false)
  })

  it("rechaza turnos con la forma anterior", () => {
    const state = freshState(now)
    const appointments = state.appointments.map(({ reminderAttempts: _omitted, ...appointment }) => appointment)

    expect(isDemoState({ ...state, appointments })).toBe(false)
  })
})
