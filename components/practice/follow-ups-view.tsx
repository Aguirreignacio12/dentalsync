"use client"

import { useMemo, useState } from "react"
import { CalendarPlus2, Check, ChevronRight, Clock3, Flag, MessageCircleMore, Plus, UserRoundCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FollowUpBadge, PatientAvatar } from "./status-badges"
import { daysBetween, formatDateShort, formatRelativeDate } from "./formatters"
import type { DemoState, FollowUp } from "./types"

type FollowUpFilter = "attention" | "waiting" | "scheduled" | "closed"

function getDueLabel(followUp: FollowUp, todayKey: string) {
  if (followUp.state === "scheduled") return "Próxima sesión agendada"
  const days = daysBetween(todayKey, followUp.recommendedDate)
  if (days < 0) return `Atrasado hace ${Math.abs(days)} ${Math.abs(days) === 1 ? "día" : "días"}`
  if (days === 0) return "Para revisar hoy"
  return `Revisar en ${days} ${days === 1 ? "día" : "días"}`
}

function FollowUpCard({
  followUp,
  patientName,
  lastAppointmentDate,
  nextAppointment,
  todayKey,
  onOpen,
  onSendMessage,
  onSchedule,
  onContact,
  onToggleReview,
  onClose,
}: {
  followUp: FollowUp
  patientName: string
  lastAppointmentDate: string
  nextAppointment?: { date: string; time: string }
  todayKey: string
  onOpen: () => void
  onSendMessage: () => void
  onSchedule: () => void
  onContact: () => void
  onToggleReview: () => void
  onClose: () => void
}) {
  const needsAction = followUp.state === "next-session-pending" || followUp.state === "contact-pending"
  return (
    <Card className="rounded-[20px] border-border/80 bg-card shadow-[0_2px_12px_rgba(25,45,39,0.025)]">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3.5">
          <PatientAvatar name={patientName} className="size-11 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={onOpen} className="text-left text-sm font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{patientName}</button>
              <FollowUpBadge state={followUp.state} />
              {followUp.needsReview && <Badge variant="outline" className="status-badge status-warning"><Flag data-icon="inline-start" />Para revisar</Badge>}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {followUp.state === "scheduled" && nextAppointment
                ? `Próximo turno: ${formatRelativeDate(nextAppointment.date, todayKey)} a las ${nextAppointment.time}`
                : followUp.state === "closed"
                  ? "Seguimiento cerrado por la odontóloga"
                  : "Todavía no tiene una próxima sesión agendada"}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Clock3 aria-hidden="true" className="size-3.5" />Último turno: {formatDateShort(lastAppointmentDate)}</span>
              {followUp.state !== "scheduled" && followUp.state !== "closed" && <span className="font-medium text-foreground/70">{getDueLabel(followUp, todayKey)}</span>}
            </div>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label={`Ver seguimiento de ${patientName}`} onClick={onOpen} className="-mr-1 rounded-lg">
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>

        {followUp.state !== "closed" && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border/70 pt-4">
            {needsAction ? (
              <>
                <Button size="sm" onClick={onSendMessage} className="h-9 rounded-lg">
                  <MessageCircleMore data-icon="inline-start" />
                  Enviar mensaje
                </Button>
                <Button size="sm" variant="outline" onClick={onSchedule} className="h-9 rounded-lg">
                  <CalendarPlus2 data-icon="inline-start" />
                  Agendar sesión
                </Button>
                <Button size="sm" variant="ghost" onClick={onContact} className="h-9 rounded-lg text-muted-foreground">
                  <UserRoundCheck data-icon="inline-start" />
                  Registrar contacto
                </Button>
              </>
            ) : followUp.state === "scheduled" ? (
              <Button size="sm" variant="outline" onClick={onOpen} className="h-9 rounded-lg">Ver turno agendado</Button>
            ) : (
              <Button size="sm" variant="outline" onClick={onContact} className="h-9 rounded-lg">Registrar respuesta</Button>
            )}
            <Button
              size="sm"
              variant={followUp.needsReview ? "secondary" : "ghost"}
              aria-pressed={Boolean(followUp.needsReview)}
              onClick={onToggleReview}
              className="h-9 rounded-lg text-muted-foreground"
            >
              <Flag data-icon="inline-start" />
              {followUp.needsReview ? "Quitar marca de revisión" : "Marcar para revisión"}
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose} className="ml-auto h-9 rounded-lg text-muted-foreground">
              <Check data-icon="inline-start" />
              Cerrar seguimiento
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function FollowUpsView({
  data,
  todayKey,
  onOpenFollowUp,
  onSendMessage,
  onSchedule,
  onContact,
  onToggleReview,
  onClose,
  onNewFollowUp,
}: {
  data: DemoState
  todayKey: string
  onOpenFollowUp: (id: string) => void
  onSendMessage: (id: string) => void
  onSchedule: (id: string) => void
  onContact: (id: string) => void
  onToggleReview: (id: string) => void
  onClose: (id: string) => void
  onNewFollowUp: () => void
}) {
  const [filter, setFilter] = useState<FollowUpFilter>("attention")
  const patientById = useMemo(() => new Map(data.patients.map((patient) => [patient.id, patient])), [data.patients])
  const appointmentById = useMemo(() => new Map(data.appointments.map((appointment) => [appointment.id, appointment])), [data.appointments])
  const filteredFollowUps = data.followUps.filter((followUp) => {
    if (filter === "attention") return followUp.needsReview || ["next-session-pending", "contact-pending"].includes(followUp.state)
    if (filter === "waiting") return ["message-sent", "waiting-response"].includes(followUp.state)
    return followUp.state === filter
  }).sort((a, b) => a.recommendedDate.localeCompare(b.recommendedDate))
  const filterCount = (value: FollowUpFilter) => data.followUps.filter((followUp) => {
    if (value === "attention") return followUp.needsReview || ["next-session-pending", "contact-pending"].includes(followUp.state)
    if (value === "waiting") return ["message-sent", "waiting-response"].includes(followUp.state)
    return followUp.state === value
  }).length

  return (
    <div className="flex flex-col gap-6 sm:gap-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-[13px] font-medium text-muted-foreground">Continuidad de atención</p>
          <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.045em] text-foreground sm:text-[36px]">Seguimientos</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Una lista de tareas indicada por la Dra. Laura, sin inferir necesidades clínicas desde la agenda.</p>
        </div>
        <Button onClick={onNewFollowUp} className="h-10 w-full rounded-xl sm:w-auto">
          <Plus data-icon="inline-start" />
          Nuevo seguimiento
        </Button>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-[#dfe9e3] bg-[#f0f6f2] px-4 py-3.5">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#397561] shadow-sm"><UserRoundCheck aria-hidden="true" className="size-4" /></span>
        <div>
          <p className="text-sm font-semibold text-[#294d40]">La odontóloga define quién necesita continuar</p>
          <p className="mt-1 text-xs leading-relaxed text-[#61786c]">El sistema organiza recordatorios y tareas. No interpreta tratamientos ni datos clínicos.</p>
        </div>
      </div>

      <Tabs value={filter} onValueChange={(value) => setFilter(value as FollowUpFilter)}>
        <TabsList variant="line" className="w-full justify-start overflow-x-auto rounded-none border-b border-border/70 bg-transparent p-0">
          <TabsTrigger value="attention" className="gap-2 px-3 text-xs sm:text-sm">Requieren acción <span className="rounded-full bg-[#f2f4ef] px-1.5 py-0.5 text-[10px] font-semibold">{filterCount("attention")}</span></TabsTrigger>
          <TabsTrigger value="waiting" className="gap-2 px-3 text-xs sm:text-sm">En espera <span className="rounded-full bg-[#f2f4ef] px-1.5 py-0.5 text-[10px] font-semibold">{filterCount("waiting")}</span></TabsTrigger>
          <TabsTrigger value="scheduled" className="px-3 text-xs sm:text-sm">Agendados</TabsTrigger>
          <TabsTrigger value="closed" className="px-3 text-xs sm:text-sm">Cerrados</TabsTrigger>
        </TabsList>
        <TabsContent value={filter} className="mt-4 focus-visible:outline-none">
          {filteredFollowUps.length ? (
            <div className="grid gap-3.5 xl:grid-cols-2">
              {filteredFollowUps.map((followUp) => {
                const patient = patientById.get(followUp.patientId)
                if (!patient) return null
                const nextAppointment = followUp.nextAppointmentId ? appointmentById.get(followUp.nextAppointmentId) : undefined
                return (
                  <FollowUpCard
                    key={followUp.id}
                    followUp={followUp}
                    patientName={patient.name}
                    lastAppointmentDate={followUp.lastAppointmentDate}
                    nextAppointment={nextAppointment ? { date: nextAppointment.date, time: nextAppointment.time } : undefined}
                    todayKey={todayKey}
                    onOpen={() => onOpenFollowUp(followUp.id)}
                    onSendMessage={() => onSendMessage(followUp.id)}
                    onSchedule={() => onSchedule(followUp.id)}
                    onContact={() => onContact(followUp.id)}
                    onToggleReview={() => onToggleReview(followUp.id)}
                    onClose={() => onClose(followUp.id)}
                  />
                )
              })}
            </div>
          ) : (
            <Empty className="min-h-64 rounded-[22px] border border-dashed border-border bg-card/60">
              <EmptyHeader>
                <EmptyMedia variant="icon"><Check /></EmptyMedia>
                <EmptyTitle>{filter === "attention" ? "No hay seguimientos pendientes" : "No hay seguimientos en esta lista"}</EmptyTitle>
                <EmptyDescription>Cuando la Dra. Laura indique una nueva tarea, va a aparecer acá.</EmptyDescription>
              </EmptyHeader>
              {filter === "attention" && <Button variant="outline" size="sm" onClick={onNewFollowUp}>Crear seguimiento</Button>}
            </Empty>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
