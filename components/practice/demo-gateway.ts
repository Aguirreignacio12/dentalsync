import type { ReminderGateway } from "./reminder-engine"

const undeliverablePatientIds = new Set(["p-pedro"])

export const demoGateway: ReminderGateway = {
  send: (message) => undeliverablePatientIds.has(message.patientId) ? "failed" : "delivered",
}
