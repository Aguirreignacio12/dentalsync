export type Section = "inicio" | "turnos" | "seguimientos" | "pacientes"

export type ConfirmationState =
  | "pending"
  | "confirmed"
  | "reschedule-requested"
  | "cancel-requested"

export type AppointmentState = "scheduled" | "cancelled"
export type AttendanceState = "unknown" | "attended" | "no-show" | "cancelled"
export type ReminderState = "not-sent" | "sent" | "delivered" | "failed"

export type ReminderStep = "first" | "second"
export type ReminderAttempt = { step: ReminderStep; at: string; result: "delivered" | "failed" }
export type CallReason = "no-consent" | "too-soon" | "no-response" | "undelivered"

export type Appointment = {
  id: string
  patientId: string
  date: string
  time: string
  confirmation: ConfirmationState
  state: AppointmentState
  attendance: AttendanceState
  reminder: ReminderState
  reminderSentAt?: string
  reminderAttempts: ReminderAttempt[]
  callReason?: CallReason
}

export type FollowUpState =
  | "next-session-pending"
  | "contact-pending"
  | "message-sent"
  | "waiting-response"
  | "scheduled"
  | "closed"

export type FollowUpActivity = {
  id: string
  label: string
  detail?: string
  at: string
  kind: "created" | "message" | "response" | "contact" | "scheduled" | "closed" | "review"
}

export type FollowUp = {
  id: string
  patientId: string
  lastAppointmentDate: string
  recommendedDate: string
  state: FollowUpState
  nextAppointmentId?: string
  needsReview?: boolean
  activities: FollowUpActivity[]
}

export type Patient = {
  id: string
  name: string
  phone: string
  whatsappConsent: boolean
  consentUpdatedAt?: string
}

export type Communication = {
  id: string
  patientId: string
  appointmentId?: string
  followUpId?: string
  direction: "outbound" | "inbound" | "system"
  kind: "reminder" | "follow-up" | "response" | "contact"
  text: string
  status: "sent" | "delivered" | "failed" | "received" | "logged"
  at: string
}

export type DemoState = {
  patients: Patient[]
  appointments: Appointment[]
  followUps: FollowUp[]
  communications: Communication[]
  clockOffsetMs: number
}

export type DetailTarget =
  | { kind: "appointment"; id: string }
  | { kind: "follow-up"; id: string }
  | { kind: "patient"; id: string }
  | null
