"use client"

import {
  CalendarClock,
  CalendarPlus2,
  Check,
  Clock3,
  MessageCircleMore,
  Phone,
  ShieldAlert,
  UserRoundCheck,
  X,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { AttendanceBadge, ConfirmationBadge, FollowUpBadge, PatientAvatar, ReminderBadge } from "./status-badges"
import { daysBetween, formatDateLong, formatDateShort, formatRelativeDate, formatTimestamp, getFirstName } from "./formatters"
import type { DemoState, DetailTarget, FollowUpActivity } from "./types"
import type { MessageTarget } from "./interaction-dialogs"

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">{children}</p>
}

function CommunicationList({ data, patientId, appointmentId, followUpId }: {
  data: DemoState
  patientId: string
  appointmentId?: string
  followUpId?: string
}) {
  const communications = data.communications
    .filter((item) => item.patientId === patientId)
    .filter((item) => appointmentId ? item.appointmentId === appointmentId : followUpId ? item.followUpId === followUpId : true)
    .sort((a, b) => b.at.localeCompare(a.at))

  if (!communications.length) {
    return <p className="mt-3 rounded-xl bg-muted/60 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">Todavía no hay comunicaciones registradas.</p>
  }

  return (
    <ul className="mt-3 flex flex-col gap-3">
      {communications.map((communication) => (
        <li key={communication.id} className="rounded-xl border border-border/70 bg-background p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`size-1.5 rounded-full ${communication.direction === "inbound" ? "bg-[#b48c4c]" : communication.status === "failed" ? "bg-destructive" : "bg-primary"}`} aria-hidden="true" />
              <span className="text-xs font-semibold text-foreground">
                {communication.direction === "inbound" ? "Respuesta recibida" : communication.direction === "system" ? "Registro interno" : communication.kind === "follow-up" ? "Seguimiento" : "Recordatorio"}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">{formatTimestamp(communication.at)}</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{communication.text}</p>
          <p className="mt-2 text-[10px] font-medium text-muted-foreground/80">
            {communication.status === "failed" ? "No entregado" : communication.status === "received" ? "Recibido" : communication.status === "logged" ? "Registrado" : communication.status === "sent" ? "Enviado" : "Entregado"}
          </p>
        </li>
      ))}
    </ul>
  )
}

function ActivityTimeline({ activities }: { activities: FollowUpActivity[] }) {
  return (
    <ol className="mt-3 flex flex-col gap-0">
      {[...activities].sort((a, b) => b.at.localeCompare(a.at)).map((activity, index) => (
        <li key={activity.id} className="relative flex gap-3 pb-4 last:pb-0">
          {index < activities.length - 1 && <span aria-hidden="true" className="absolute left-[7px] top-4 h-full w-px bg-border" />}
          <span className="relative mt-1 size-3.5 shrink-0 rounded-full border-[3px] border-primary/25 bg-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-foreground">{activity.label}</p>
              <p className="text-[10px] text-muted-foreground">{formatTimestamp(activity.at)}</p>
            </div>
            {activity.detail && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{activity.detail}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}

export function DetailDrawer({
  target,
  data,
  todayKey,
  onClose,
  onOpenAppointment,
  onOpenFollowUp,
  onSendMessage,
  onConfirmAppointment,
  onCancelAppointment,
  onSetAttendance,
  onReschedule,
  onContactFollowUp,
  onScheduleFollowUp,
  onCloseFollowUp,
}: {
  target: DetailTarget
  data: DemoState
  todayKey: string
  onClose: () => void
  onOpenAppointment: (id: string) => void
  onOpenFollowUp: (id: string) => void
  onSendMessage: (target: Exclude<MessageTarget, null>) => void
  onConfirmAppointment: (id: string) => void
  onCancelAppointment: (id: string) => void
  onSetAttendance: (id: string, state: "attended" | "no-show") => void
  onReschedule: (id: string) => void
  onContactFollowUp: (id: string) => void
  onScheduleFollowUp: (id: string) => void
  onCloseFollowUp: (id: string) => void
}) {
  const appointment = target?.kind === "appointment" ? data.appointments.find((item) => item.id === target.id) : undefined
  const followUp = target?.kind === "follow-up" ? data.followUps.find((item) => item.id === target.id) : undefined
  const patientId = appointment?.patientId ?? followUp?.patientId ?? (target?.kind === "patient" ? target.id : undefined)
  const patient = data.patients.find((item) => item.id === patientId)
  const activeFollowUp = patient ? data.followUps.find((item) => item.patientId === patient.id && item.state !== "closed") : undefined
  const nextAppointment = patient
    ? data.appointments.filter((item) => item.patientId === patient.id && item.state === "scheduled" && item.date >= todayKey).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0]
    : undefined
  const canRecordAttendance = !!appointment && appointment.state === "scheduled" && appointment.date <= todayKey

  return (
    <Sheet open={!!target} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent className="w-full overflow-y-auto border-border bg-background p-0 sm:max-w-[480px]" side="right">
        {!target || !patient ? (
          <SheetHeader>
            <SheetTitle>Detalle no disponible</SheetTitle>
            <SheetDescription>El registro ya no está disponible.</SheetDescription>
          </SheetHeader>
        ) : (
          <>
            <SheetHeader className="border-b border-border/70 px-5 pb-5 pt-7 sm:px-6">
              <div className="flex items-center gap-3 pr-7">
                <PatientAvatar name={patient.name} className="size-12" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{target.kind === "appointment" ? "Detalle del turno" : target.kind === "follow-up" ? "Seguimiento operativo" : "Ficha de contacto"}</p>
                  <SheetTitle className="mt-1 truncate text-lg font-semibold tracking-tight">{patient.name}</SheetTitle>
                  <SheetDescription className="mt-1 flex items-center gap-1.5 text-xs"><Phone aria-hidden="true" className="size-3.5" />{patient.phone}</SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="flex flex-col gap-5 px-5 py-5 sm:px-6">
              {target.kind === "appointment" && appointment && (
                <>
                  <section className="rounded-2xl border border-border/80 bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <SectionLabel>Turno</SectionLabel>
                        <p className="mt-2 text-base font-semibold text-foreground">{formatDateLong(appointment.date)}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><Clock3 aria-hidden="true" className="size-4" />{appointment.time}</p>
                      </div>
                      <Badge variant="outline" className={appointment.state === "cancelled" ? "status-badge status-neutral" : "status-badge status-info"}>{appointment.state === "cancelled" ? "Cancelado" : "En agenda"}</Badge>
                    </div>
                    <Separator className="my-4" />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div><SectionLabel>Confirmación</SectionLabel><div className="mt-2"><ConfirmationBadge state={appointment.confirmation} /></div></div>
                      <div><SectionLabel>Asistencia</SectionLabel><div className="mt-2"><AttendanceBadge state={appointment.attendance} /></div></div>
                      <div className="sm:col-span-2"><SectionLabel>Recordatorio</SectionLabel><div className="mt-2"><ReminderBadge state={appointment.reminder} /></div></div>
                    </div>
                  </section>

                  {appointment.confirmation === "reschedule-requested" && (
                    <Alert className="rounded-xl border-[#e6def1] bg-[#f8f5fb] text-[#69557f]">
                      <CalendarClock aria-hidden="true" /><AlertTitle className="text-sm">Pidió reprogramar</AlertTitle>
                      <AlertDescription className="text-xs text-[#756585]">El turno sigue en la agenda hasta que se actualice el horario.</AlertDescription>
                    </Alert>
                  )}
                  {appointment.confirmation === "cancel-requested" && (
                    <Alert className="rounded-xl border-[#eadfc9] bg-[#fbf8f0] text-[#715d39]">
                      <MessageCircleMore aria-hidden="true" /><AlertTitle className="text-sm">Solicitó cancelar</AlertTitle>
                      <AlertDescription className="text-xs text-[#806e4d]">Revisá la solicitud y confirmá la cancelación para liberar el turno.</AlertDescription>
                    </Alert>
                  )}

                  {appointment.state === "scheduled" && !patient.whatsappConsent && (
                    <Alert className="rounded-xl border-[#eadfc9] bg-[#fbf8f0] text-[#715d39]">
                      <ShieldAlert aria-hidden="true" /><AlertTitle className="text-sm">WhatsApp deshabilitado</AlertTitle>
                      <AlertDescription className="text-xs text-[#806e4d]">No hay autorización registrada para este canal. Usá el contacto habitual del consultorio.</AlertDescription>
                    </Alert>
                  )}

                  {appointment.state === "scheduled" && (
                    <section className="flex flex-col gap-2">
                      <SectionLabel>Acciones del turno</SectionLabel>
                      <Button className="h-10 justify-start rounded-xl" disabled={!patient.whatsappConsent} onClick={() => onSendMessage({ kind: "appointment", id: appointment.id })}>
                        <MessageCircleMore data-icon="inline-start" />{appointment.reminder === "failed" ? "Reintentar recordatorio" : "Enviar recordatorio"}
                      </Button>
                      {appointment.confirmation === "pending" && <Button variant="outline" className="h-10 justify-start rounded-xl" onClick={() => onConfirmAppointment(appointment.id)}><Check data-icon="inline-start" />Marcar como confirmado</Button>}
                      <Button variant="outline" className="h-10 justify-start rounded-xl" onClick={() => onReschedule(appointment.id)}><CalendarPlus2 data-icon="inline-start" />Reprogramar turno</Button>
                      {appointment.confirmation === "cancel-requested" ? (
                        <Button variant="outline" className="h-10 justify-start rounded-xl border-destructive/25 text-destructive hover:bg-destructive/5" onClick={() => onCancelAppointment(appointment.id)}><X data-icon="inline-start" />Confirmar cancelación</Button>
                      ) : (
                        <Button variant="ghost" className="h-10 justify-start rounded-xl text-muted-foreground hover:text-destructive" onClick={() => onCancelAppointment(appointment.id)}><X data-icon="inline-start" />Registrar cancelación</Button>
                      )}
                      {canRecordAttendance && appointment.attendance === "unknown" && (
                        <div className="mt-1 grid grid-cols-2 gap-2 border-t border-border/70 pt-3">
                          <Button variant="outline" className="h-10 rounded-xl" onClick={() => onSetAttendance(appointment.id, "attended")}><UserRoundCheck data-icon="inline-start" />Asistió</Button>
                          <Button variant="outline" className="h-10 rounded-xl" onClick={() => onSetAttendance(appointment.id, "no-show")}><X data-icon="inline-start" />No asistió</Button>
                        </div>
                      )}
                    </section>
                  )}

                  <section>
                    <SectionLabel>Historial del turno</SectionLabel>
                    <CommunicationList data={data} patientId={patient.id} appointmentId={appointment.id} />
                  </section>
                </>
              )}

              {target.kind === "follow-up" && followUp && (
                <>
                  <section className="rounded-2xl border border-border/80 bg-card p-4">
                    <div className="flex items-center justify-between gap-2"><SectionLabel>Estado del seguimiento</SectionLabel><FollowUpBadge state={followUp.state} /></div>
                    <p className="mt-4 text-sm leading-relaxed text-foreground">{followUp.state === "scheduled" && followUp.nextAppointmentId ? "La próxima sesión ya está agendada." : "No tiene una próxima sesión agendada."}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div><SectionLabel>Último turno</SectionLabel><p className="mt-1.5 text-sm font-medium">{formatDateShort(followUp.lastAppointmentDate)}</p></div>
                      <div><SectionLabel>Fecha de revisión</SectionLabel><p className="mt-1.5 text-sm font-medium">{formatDateShort(followUp.recommendedDate)}</p></div>
                    </div>
                    {followUp.nextAppointmentId && (() => {
                      const next = data.appointments.find((item) => item.id === followUp.nextAppointmentId)
                      return next ? <Button variant="outline" className="mt-4 w-full justify-between rounded-xl" onClick={() => onOpenAppointment(next.id)}>Ver turno de {formatRelativeDate(next.date, todayKey)}<CalendarPlus2 data-icon="inline-end" /></Button> : null
                    })()}
                  </section>
                  <section className="flex flex-col gap-2">
                    <SectionLabel>Acciones de seguimiento</SectionLabel>
                    {followUp.state !== "scheduled" && followUp.state !== "closed" && (
                      <>
                        <Button className="h-10 justify-start rounded-xl" disabled={!patient.whatsappConsent} onClick={() => onSendMessage({ kind: "follow-up", id: followUp.id })}><MessageCircleMore data-icon="inline-start" />Enviar mensaje</Button>
                        <Button variant="outline" className="h-10 justify-start rounded-xl" onClick={() => onScheduleFollowUp(followUp.id)}><CalendarPlus2 data-icon="inline-start" />Agendar próxima sesión</Button>
                        <Button variant="ghost" className="h-10 justify-start rounded-xl text-muted-foreground" onClick={() => onContactFollowUp(followUp.id)}><Phone data-icon="inline-start" />Registrar contacto</Button>
                      </>
                    )}
                    {followUp.state !== "closed" && <Button variant="outline" className="h-10 justify-start rounded-xl" onClick={() => onCloseFollowUp(followUp.id)}><Check data-icon="inline-start" />Cerrar seguimiento</Button>}
                  </section>
                  <section>
                    <SectionLabel>Actividad</SectionLabel>
                    <ActivityTimeline activities={followUp.activities} />
                  </section>
                  <section>
                    <SectionLabel>Comunicaciones</SectionLabel>
                    <CommunicationList data={data} patientId={patient.id} followUpId={followUp.id} />
                  </section>
                </>
              )}

              {target.kind === "patient" && (
                <>
                  <section className="rounded-2xl border border-border/80 bg-card p-4">
                    <SectionLabel>Permiso de contacto</SectionLabel>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">WhatsApp</p>
                        <p className="mt-1 text-xs text-muted-foreground">{patient.whatsappConsent ? "Autorización registrada" : "No hay autorización registrada"}</p>
                      </div>
                      <Badge variant="outline" className={patient.whatsappConsent ? "status-badge status-success" : "status-badge status-warning"}>{patient.whatsappConsent ? "Autorizado" : "Sin permiso"}</Badge>
                    </div>
                    {patient.consentUpdatedAt && <p className="mt-2 text-[10px] text-muted-foreground">Actualizado el {formatDateShort(patient.consentUpdatedAt.slice(0, 10))}</p>}
                  </section>

                  <section className="rounded-2xl border border-border/80 bg-card p-4">
                    <SectionLabel>Próximo turno</SectionLabel>
                    {nextAppointment ? (
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div><p className="text-sm font-semibold">{formatDateLong(nextAppointment.date)}</p><p className="mt-1 text-xs text-muted-foreground">{nextAppointment.time} · {nextAppointment.confirmation === "confirmed" ? "Confirmado" : "Pendiente de confirmación"}</p></div>
                        <Button variant="outline" size="sm" className="rounded-lg" onClick={() => onOpenAppointment(nextAppointment.id)}>Ver</Button>
                      </div>
                    ) : <p className="mt-2 text-sm text-muted-foreground">No tiene un turno próximo en la agenda.</p>}
                  </section>

                  {activeFollowUp && (
                    <section className="rounded-2xl border border-border/80 bg-card p-4">
                      <div className="flex items-center justify-between gap-2"><SectionLabel>Seguimiento</SectionLabel><FollowUpBadge state={activeFollowUp.state} /></div>
                      <Button variant="outline" className="mt-3 w-full justify-between rounded-xl" onClick={() => onOpenFollowUp(activeFollowUp.id)}>Abrir seguimiento<CalendarPlus2 data-icon="inline-end" /></Button>
                    </section>
                  )}

                  {nextAppointment && <Button className="h-10 rounded-xl" disabled={!patient.whatsappConsent} onClick={() => onSendMessage({ kind: "appointment", id: nextAppointment.id })}><MessageCircleMore data-icon="inline-start" />Enviar recordatorio</Button>}
                  {!patient.whatsappConsent && (
                    <Alert className="rounded-xl border-[#eadfc9] bg-[#fbf8f0] text-[#715d39]">
                      <ShieldAlert aria-hidden="true" /><AlertTitle className="text-sm">No se puede enviar por WhatsApp</AlertTitle><AlertDescription className="text-xs text-[#806e4d]">Usá el canal habitual hasta contar con autorización registrada.</AlertDescription>
                    </Alert>
                  )}
                  <section><SectionLabel>Historial de comunicaciones</SectionLabel><CommunicationList data={data} patientId={patient.id} /></section>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
