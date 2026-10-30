"use client"

import { Check, ChevronRight, Phone, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { CallReasonBadge, ConfirmationBadge, PatientAvatar } from "./status-badges"
import { formatRelativeDate } from "./formatters"
import type { Appointment, DemoState } from "./types"

const panelClass = "overflow-hidden rounded-[22px] border-border/80 bg-card shadow-[0_2px_12px_rgba(25,45,39,0.025)]"

export function ReminderSummary({ sent, confirmed, noResponse }: { sent: number; confirmed: number; noResponse: number }) {
  return (
    <div className="flex flex-col gap-2 rounded-[20px] border border-border bg-accent px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-accent-foreground">
        <Send aria-hidden="true" className="size-4 shrink-0" />
        <span>
          <span className="tabular-nums">{sent}</span> {sent === 1 ? "recordatorio automático hoy" : "recordatorios automáticos hoy"}
          {" · "}<span className="tabular-nums">{confirmed}</span> {confirmed === 1 ? "confirmado" : "confirmados"}
          {" · "}<span className="tabular-nums">{noResponse}</span> sin respuesta
        </span>
      </p>
      <p className="text-xs text-accent-foreground">Mensajes simulados: no se envían por WhatsApp.</p>
    </div>
  )
}

function PanelShell({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <Card className={panelClass}>
      <CardHeader className="flex flex-row items-center justify-between gap-4 px-5 pb-1 pt-5 sm:px-6 sm:pt-6">
        <CardTitle className="text-[17px] font-semibold tracking-tight">{title}</CardTitle>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold tabular-nums text-muted-foreground">{count}</span>
      </CardHeader>
      <CardContent className="px-5 pb-4 pt-2 sm:px-6 sm:pb-5">{children}</CardContent>
    </Card>
  )
}

function AppointmentRow({
  appointment,
  patientName,
  phone,
  todayKey,
  badge,
  onOpen,
}: {
  appointment: Appointment
  patientName: string
  phone: string
  todayKey: string
  badge: React.ReactNode
  onOpen: () => void
}) {
  return (
    <li className="flex flex-col gap-3 py-4 first:pt-3 last:pb-1 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <PatientAvatar name={patientName} className="size-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 text-sm font-semibold text-foreground">{patientName}</p>
            {badge}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 tabular-nums"><Phone aria-hidden="true" className="size-3.5" />{phone}</span>
            <span>Turno {formatRelativeDate(appointment.date, todayKey)} a las <span className="tabular-nums">{appointment.time}</span></span>
          </div>
        </div>
      </div>
      <Button variant="outline" size="sm" aria-label={`Ver detalle de ${patientName}`} onClick={onOpen} className="h-9 w-full rounded-lg sm:w-auto">
        Ver detalle
        <ChevronRight data-icon="inline-end" aria-hidden="true" />
      </Button>
    </li>
  )
}

export function CallListPanel({
  items,
  data,
  todayKey,
  onOpenAppointment,
}: {
  items: Appointment[]
  data: DemoState
  todayKey: string
  onOpenAppointment: (id: string) => void
}) {
  const patientById = new Map(data.patients.map((patient) => [patient.id, patient]))
  return (
    <PanelShell title="Hay que llamar" count={items.length}>
      {items.length ? (
        <ul className="divide-y divide-border/70">
          {items.map((appointment) => {
            const patient = patientById.get(appointment.patientId)
            if (!patient || !appointment.callReason) return null
            return (
              <AppointmentRow
                key={appointment.id}
                appointment={appointment}
                patientName={patient.name}
                phone={patient.phone}
                todayKey={todayKey}
                badge={<CallReasonBadge reason={appointment.callReason} />}
                onOpen={() => onOpenAppointment(appointment.id)}
              />
            )
          })}
        </ul>
      ) : (
        <Empty className="min-h-48 border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Check /></EmptyMedia>
            <EmptyTitle>No hay nadie para llamar</EmptyTitle>
            <EmptyDescription>Los recordatorios siguen saliendo solos.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </PanelShell>
  )
}

export function RequestsPanel({
  items,
  data,
  todayKey,
  onOpenAppointment,
}: {
  items: Appointment[]
  data: DemoState
  todayKey: string
  onOpenAppointment: (id: string) => void
}) {
  const patientById = new Map(data.patients.map((patient) => [patient.id, patient]))
  return (
    <PanelShell title="Solicitudes" count={items.length}>
      {items.length ? (
        <ul className="divide-y divide-border/70">
          {items.map((appointment) => {
            const patient = patientById.get(appointment.patientId)
            if (!patient) return null
            return (
              <AppointmentRow
                key={appointment.id}
                appointment={appointment}
                patientName={patient.name}
                phone={patient.phone}
                todayKey={todayKey}
                badge={<ConfirmationBadge state={appointment.confirmation} />}
                onOpen={() => onOpenAppointment(appointment.id)}
              />
            )
          })}
        </ul>
      ) : (
        <Empty className="min-h-48 border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Check /></EmptyMedia>
            <EmptyTitle>No hay solicitudes pendientes</EmptyTitle>
            <EmptyDescription>Cuando un paciente pida un cambio, va a aparecer acá.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </PanelShell>
  )
}
