"use client"

import {
  ArrowRight,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MessageCircleMore,
  RefreshCw,
  UsersRound,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { CallListPanel, ReminderSummary, RequestsPanel } from "./reminder-panels"
import { getCallList, getReminderSummary, getRequests } from "./reminder-engine"
import { ReminderBadge, PatientAvatar, AppointmentBadges } from "./status-badges"
import { formatDateLong, formatDateShort, formatRelativeDate } from "./formatters"
import type { DemoState } from "./types"

type AttentionItem = {
  id: string
  patientId: string
  patientName: string
  detail: string
  action: string
  status: string
  statusTone: "status-pending" | "status-warning" | "status-info"
  priority: number
  targetId: string
}

function getAttentionItems(data: DemoState, today: string): AttentionItem[] {
  const items: AttentionItem[] = []
  const patientById = new Map(data.patients.map((patient) => [patient.id, patient]))

  for (const followUp of data.followUps) {
    if (!["next-session-pending", "contact-pending"].includes(followUp.state) && !followUp.needsReview) continue
    const patient = patientById.get(followUp.patientId)
    if (!patient) continue
    items.push({
      id: `follow-up-${followUp.id}`,
      patientId: patient.id,
      patientName: patient.name,
      detail: followUp.state === "next-session-pending"
        ? `Sin próxima sesión · revisar ${formatRelativeDate(followUp.recommendedDate, today)}`
        : followUp.state === "contact-pending"
          ? `Contacto pendiente · revisar ${formatRelativeDate(followUp.recommendedDate, today)}`
          : `Revisión manual · fecha sugerida ${formatDateShort(followUp.recommendedDate)}`,
      action: patient.whatsappConsent ? "Abrir seguimiento" : "Revisar contacto",
      status: followUp.needsReview
        ? "Para revisar"
        : followUp.state === "next-session-pending" ? "Próxima sesión pendiente" : "Contacto pendiente",
      statusTone: followUp.needsReview
        ? "status-warning"
        : followUp.state === "next-session-pending" ? "status-info" : "status-pending",
      priority: followUp.needsReview ? 2 : 3,
      targetId: followUp.id,
    })
  }

  return items.sort((a, b) => a.priority - b.priority).slice(0, 5)
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  helper: string
  icon: typeof CalendarCheck2
  tone: "teal" | "amber" | "rose" | "blue"
}) {
  return (
    <Card className="metric-card rounded-[20px] border-border/80 bg-card shadow-[0_2px_12px_rgba(25,45,39,0.025)]">
      <CardContent className="flex items-start justify-between gap-2 px-3 py-3 sm:px-3 sm:py-3 lg:px-4 lg:py-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium leading-tight text-muted-foreground sm:text-xs">{label}</p>
          <p className="mt-1.5 text-[25px] font-semibold leading-none tracking-[-0.05em] text-foreground sm:text-[27px]">{value}</p>
          <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground sm:text-[11px]">{helper}</p>
        </div>
        <div className={`metric-icon metric-icon-${tone} flex size-9 shrink-0 items-center justify-center rounded-[13px]`}>
          <Icon aria-hidden="true" className="size-[17px]" strokeWidth={1.8} />
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardView({
  data,
  todayKey,
  now,
  greeting,
  onOpenAppointment,
  onOpenFollowUp,
  onNewFollowUp,
  onSelectAppointments,
  onSync,
  syncing,
}: {
  data: DemoState
  todayKey: string
  now: number
  greeting: string
  onOpenAppointment: (id: string) => void
  onOpenFollowUp: (id: string) => void
  onNewFollowUp: () => void
  onSelectAppointments: () => void
  onSync: () => void
  syncing: boolean
}) {
  const patientById = new Map(data.patients.map((patient) => [patient.id, patient]))
  const activeAppointments = data.appointments.filter((appointment) => appointment.state === "scheduled")
  const todayAppointments = activeAppointments.filter((appointment) => appointment.date === todayKey)
  const pendingConfirmations = activeAppointments.filter((appointment) => appointment.confirmation === "pending")
  const rescheduleRequests = activeAppointments.filter((appointment) => appointment.confirmation === "reschedule-requested")
  const pendingFollowUps = data.followUps.filter((followUp) => followUp.needsReview || ["next-session-pending", "contact-pending"].includes(followUp.state))
  const attentionItems = getAttentionItems(data, todayKey)
  const callList = getCallList(data, now)
  const requests = getRequests(data)
  const summary = getReminderSummary(data, todayKey, now)
  const upcomingAppointments = activeAppointments
    .filter((appointment) => appointment.date >= todayKey)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    .slice(0, 5)

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-[13px] font-medium text-muted-foreground">{formatDateLong(todayKey)}</p>
          <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.045em] text-foreground sm:text-[36px]">{greeting}</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Acá tenés lo importante para que la agenda siga en marcha.</p>
        </div>
        <Button className="h-10 w-full rounded-xl px-4 sm:w-auto" onClick={onNewFollowUp}>
          <CheckCircle2 data-icon="inline-start" />
          Nuevo seguimiento
        </Button>
      </section>

      <section aria-label="Resumen de hoy" className="order-2 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2 lg:gap-4 md:order-1">
        <MetricCard label="Turnos de hoy" value={todayAppointments.length} helper="En la agenda" icon={CalendarCheck2} tone="teal" />
        <MetricCard label="Sin confirmar" value={pendingConfirmations.length} helper="Requieren respuesta" icon={MessageCircleMore} tone="amber" />
        <MetricCard label="Cambios pendientes" value={rescheduleRequests.length} helper="Para resolver" icon={RefreshCw} tone="rose" />
        <MetricCard label="Seguimientos" value={pendingFollowUps.length} helper="Con una acción pendiente" icon={UsersRound} tone="blue" />
      </section>

      <section aria-label="Recordatorios automáticos" className="order-1 flex flex-col gap-5 md:order-2 xl:gap-6">
        <ReminderSummary {...summary} />
        <div className="grid items-start gap-5 xl:grid-cols-[1.08fr_0.92fr] xl:gap-6">
          <CallListPanel items={callList} data={data} todayKey={todayKey} onOpenAppointment={onOpenAppointment} />
          <RequestsPanel items={requests} data={data} todayKey={todayKey} onOpenAppointment={onOpenAppointment} />
        </div>
      </section>

      <section className="order-1 grid items-start gap-5 md:order-2 xl:grid-cols-[1.08fr_0.92fr] xl:gap-6">
        <Card className="overflow-hidden rounded-[22px] border-border/80 bg-card shadow-[0_2px_12px_rgba(25,45,39,0.025)]">
          <CardHeader className="flex flex-row items-center justify-between gap-4 px-5 pb-1 pt-5 sm:px-6 sm:pt-6">
            <div>
              <CardTitle className="text-[17px] font-semibold tracking-tight">Necesitan tu atención</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Acciones que conviene resolver primero</p>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">{attentionItems.length}</span>
          </CardHeader>
          <CardContent className="px-5 pb-4 pt-2 sm:px-6 sm:pb-5">
            {attentionItems.length ? (
              <ul className="divide-y divide-border/70">
                {attentionItems.map((item) => {
                  return (
                    <li key={item.id} className="flex items-center gap-3 py-4 first:pt-3 last:pb-1 sm:gap-4">
                      <PatientAvatar name={item.patientName} className="size-10 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{item.patientName}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="min-w-0 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
                          <Badge variant="outline" className={`status-badge ${item.statusTone}`}>{item.status}</Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 shrink-0 rounded-lg px-2.5 text-xs sm:px-3"
                        aria-label={`${item.action}: ${item.patientName}`}
                        onClick={() => onOpenFollowUp(item.targetId)}
                      >
                        <span className="hidden sm:inline">{item.action}</span>
                        <span className="sm:hidden"><CheckCircle2 aria-hidden="true" /></span>
                        <ChevronRight aria-hidden="true" className="ml-0.5 hidden size-3.5 sm:block" />
                      </Button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <Empty className="min-h-48 border-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon"><CheckCircle2 /></EmptyMedia>
                  <EmptyTitle>Todo al día</EmptyTitle>
                  <EmptyDescription>No hay acciones urgentes para resolver.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-[22px] border-border/80 bg-card shadow-[0_2px_12px_rgba(25,45,39,0.025)]">
          <CardHeader className="flex flex-row items-center justify-between gap-3 px-5 pb-1 pt-5 sm:px-6 sm:pt-6">
            <div>
              <CardTitle className="text-[17px] font-semibold tracking-tight">Próximos turnos</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">{todayAppointments.length} en agenda para hoy</p>
            </div>
            <Button variant="ghost" size="sm" className="h-8 rounded-lg px-2 text-xs" onClick={onSelectAppointments}>
              Ver todos <ArrowRight data-icon="inline-end" />
            </Button>
          </CardHeader>
          <CardContent className="px-5 pb-4 pt-2 sm:px-6 sm:pb-5">
            {upcomingAppointments.length ? (
              <ul className="divide-y divide-border/70">
                {upcomingAppointments.map((appointment) => {
                  const patient = patientById.get(appointment.patientId)
                  if (!patient) return null
                  return (
                    <li key={appointment.id}>
                      <button
                        type="button"
                        onClick={() => onOpenAppointment(appointment.id)}
                        className="group flex w-full items-center gap-3 py-3.5 text-left first:pt-3 last:pb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      >
                        <div className="w-12 shrink-0 text-center">
                          <p className="text-sm font-semibold tabular-nums text-foreground">{appointment.time}</p>
                          <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">{formatRelativeDate(appointment.date, todayKey)}</p>
                        </div>
                        <span className="h-9 w-px shrink-0 bg-border/80" aria-hidden="true" />
                        <PatientAvatar name={patient.name} className="size-9 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{patient.name}</p>
                          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Clock3 aria-hidden="true" className="size-3" />
                            <span>{formatDateShort(appointment.date)}</span>
                            <span aria-hidden="true">·</span>
                            <ReminderBadge state={appointment.reminder} />
                          </div>
                        </div>
                        <AppointmentBadges appointment={appointment} />
                        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <Empty className="min-h-48 border-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon"><CalendarClock /></EmptyMedia>
                  <EmptyTitle>No hay próximos turnos</EmptyTitle>
                  <EmptyDescription>Esta agenda de demostración no consulta Google Calendar.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="order-3 flex flex-col gap-3 rounded-[20px] border border-[#dfe9e3] bg-[#f0f6f2] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#397561] shadow-sm">
            <CalendarCheck2 aria-hidden="true" className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[#294d40]">Sincronización simulada</p>
            <p className="mt-0.5 text-xs leading-relaxed text-[#61786c]">La agenda de ejemplo no se conecta a una cuenta real de Google Calendar.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onSync} disabled={syncing} className="h-9 w-full rounded-lg border-[#cbdcd2] bg-white text-[#315b4d] hover:bg-[#f9fcfa] sm:w-auto">
          <RefreshCw data-icon="inline-start" className={syncing ? "animate-spin" : undefined} />
          {syncing ? "Simulando…" : "Simular sincronización"}
        </Button>
      </section>
    </div>
  )
}
