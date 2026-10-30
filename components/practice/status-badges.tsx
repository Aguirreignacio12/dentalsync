import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getInitials } from "./formatters"
import { callReasonLabels } from "./reminder-engine"
import type { Appointment, AttendanceState, CallReason, ConfirmationState, ReminderState } from "./types"

const confirmationDetails: Record<ConfirmationState, { label: string; tone: string }> = {
  pending: { label: "Pendiente de confirmación", tone: "pending" },
  confirmed: { label: "Confirmado", tone: "success" },
  "reschedule-requested": { label: "Reprogramación solicitada", tone: "violet" },
  "cancel-requested": { label: "Cancelación solicitada", tone: "warning" },
}

const attendanceDetails: Record<AttendanceState, { label: string; tone: string }> = {
  unknown: { label: "Asistencia pendiente", tone: "neutral" },
  attended: { label: "Asistió", tone: "success" },
  "no-show": { label: "No asistió", tone: "danger" },
  cancelled: { label: "Cancelado", tone: "neutral" },
}

const reminderDetails: Record<ReminderState, { label: string; tone: string }> = {
  "not-sent": { label: "Sin enviar", tone: "neutral" },
  sent: { label: "Enviado", tone: "info" },
  delivered: { label: "Entregado", tone: "success" },
  failed: { label: "No entregado", tone: "danger" },
}

const callReasonTones: Record<CallReason, string> = {
  "no-consent": "warning",
  "too-soon": "warning",
  "no-response": "warning",
  undelivered: "danger",
}

export function CallReasonBadge({ reason }: { reason: CallReason }) {
  return <Badge variant="outline" className={`status-badge status-${callReasonTones[reason]}`}>{callReasonLabels[reason]}</Badge>
}

export function ConfirmationBadge({ state }: { state: ConfirmationState }) {
  const detail = confirmationDetails[state]
  return <Badge variant="outline" className={`status-badge status-${detail.tone}`}>{detail.label}</Badge>
}

export function AttendanceBadge({ state }: { state: AttendanceState }) {
  const detail = attendanceDetails[state]
  return <Badge variant="outline" className={`status-badge status-${detail.tone}`}>{detail.label}</Badge>
}

export function ReminderBadge({ state }: { state: ReminderState }) {
  const detail = reminderDetails[state]
  return <Badge variant="outline" className={`status-badge status-${detail.tone}`}>{detail.label}</Badge>
}

export function AppointmentBadges({ appointment }: { appointment: Appointment }) {
  if (appointment.state === "cancelled") {
    return <Badge variant="outline" className="status-badge status-neutral">Cancelado</Badge>
  }
  if (appointment.attendance !== "unknown") {
    return <AttendanceBadge state={appointment.attendance} />
  }
  return <ConfirmationBadge state={appointment.confirmation} />
}

export function PatientAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <Avatar className={className}>
      <AvatarFallback className="bg-primary/10 font-semibold text-primary">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  )
}

export function FollowUpBadge({ state }: { state: string }) {
  const details: Record<string, { label: string; tone: string }> = {
    "next-session-pending": { label: "Próxima sesión pendiente", tone: "pending" },
    "contact-pending": { label: "Contacto pendiente", tone: "warning" },
    "message-sent": { label: "Mensaje enviado", tone: "info" },
    "waiting-response": { label: "Esperando respuesta", tone: "violet" },
    scheduled: { label: "Próxima sesión agendada", tone: "success" },
    closed: { label: "Cerrado por la odontóloga", tone: "neutral" },
  }
  const detail = details[state] ?? { label: "En seguimiento", tone: "neutral" }
  return <Badge variant="outline" className={`status-badge status-${detail.tone}`}>{detail.label}</Badge>
}
