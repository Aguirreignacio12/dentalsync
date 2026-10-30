"use client"

import { useMemo, useState } from "react"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  Search,
  SlidersHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { AppointmentBadges, CallReasonBadge, PatientAvatar, ReminderBadge } from "./status-badges"
import { addDays } from "./demo-data"
import { formatDateLong, formatDateShort } from "./formatters"
import { isEligible } from "./reminder-engine"
import type { Appointment, DemoState } from "./types"

type AppointmentFilter = "all" | "call" | "pending" | "confirmed" | "change-requested" | "cancelled" | "attended" | "no-show"

function matchesFilter(appointment: Appointment, filter: AppointmentFilter, now: number) {
  if (filter === "all") return true
  if (filter === "call") return Boolean(appointment.callReason) && isEligible(appointment, now)
  if (filter === "pending") return appointment.state === "scheduled" && appointment.confirmation === "pending"
  if (filter === "confirmed") return appointment.state === "scheduled" && appointment.confirmation === "confirmed"
  if (filter === "change-requested") return appointment.confirmation === "reschedule-requested" || appointment.confirmation === "cancel-requested"
  if (filter === "cancelled") return appointment.state === "cancelled"
  if (filter === "attended") return appointment.attendance === "attended"
  return appointment.attendance === "no-show"
}

export function AppointmentsView({
  data,
  todayKey,
  now,
  onOpenAppointment,
  onSync,
  syncing,
}: {
  data: DemoState
  todayKey: string
  now: number
  onOpenAppointment: (id: string) => void
  onSync: () => void
  syncing: boolean
}) {
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<AppointmentFilter>("all")
  const patientById = useMemo(() => new Map(data.patients.map((patient) => [patient.id, patient])), [data.patients])

  const visibleAppointments = data.appointments
    .filter((appointment) => appointment.date === selectedDate)
    .filter((appointment) => matchesFilter(appointment, filter, now))
    .filter((appointment) => {
      if (!search.trim()) return true
      const patient = patientById.get(appointment.patientId)
      return patient?.name.toLocaleLowerCase("es-AR").includes(search.trim().toLocaleLowerCase("es-AR"))
    })
    .sort((a, b) => a.time.localeCompare(b.time))

  const dayLabel = selectedDate === todayKey ? "Hoy" : formatDateLong(selectedDate)

  return (
    <div className="flex flex-col gap-6 sm:gap-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-[13px] font-medium text-muted-foreground">Agenda del consultorio</p>
          <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.045em] text-foreground sm:text-[36px]">Turnos</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Revisá confirmaciones, cambios y asistencia desde una sola vista.</p>
        </div>
        <Button variant="outline" onClick={onSync} disabled={syncing} className="h-10 w-full rounded-xl sm:w-auto">
          <CalendarDays data-icon="inline-start" className={syncing ? "animate-pulse" : undefined} />
          {syncing ? "Simulando…" : "Simular sincronización"}
        </Button>
      </div>

      <Card className="rounded-[22px] border-border/80 bg-card shadow-[0_2px_12px_rgba(25,45,39,0.025)]">
        <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-[#fafaf8] p-1">
              <Button variant="ghost" size="icon-sm" aria-label="Día anterior" onClick={() => setSelectedDate((date) => addDays(date, -1))} className="rounded-lg">
                <ChevronLeft aria-hidden="true" />
              </Button>
              <label className="flex min-w-[145px] items-center justify-center gap-2 px-2 text-sm font-semibold text-foreground">
                <span>{dayLabel}</span>
                <input
                  aria-label="Elegir día de agenda"
                  type="date"
                  value={selectedDate}
                  onChange={(event) => event.target.value && setSelectedDate(event.target.value)}
                  className="sr-only"
                />
                <CalendarDays aria-hidden="true" className="size-4 text-muted-foreground" />
              </label>
              <Button variant="ghost" size="icon-sm" aria-label="Día siguiente" onClick={() => setSelectedDate((date) => addDays(date, 1))} className="rounded-lg">
                <ChevronRight aria-hidden="true" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedDate(todayKey)} className="ml-1 h-8 rounded-lg px-2.5 text-xs">Hoy</Button>
            </div>
            <p className="text-xs text-muted-foreground">{visibleAppointments.length} {visibleAppointments.length === 1 ? "turno" : "turnos"}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(200px,1fr)_220px]">
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre…" aria-label="Buscar pacientes por nombre" className="h-10 rounded-xl pl-9" />
            </div>
            <label className="relative flex items-center">
              <SlidersHorizontal aria-hidden="true" className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
              <select
                aria-label="Filtrar turnos por estado"
                value={filter}
                onChange={(event) => setFilter(event.target.value as AppointmentFilter)}
                className="h-10 w-full appearance-none rounded-xl border border-input bg-background pl-9 pr-9 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                <option value="all">Todos los estados</option>
                <option value="call">Hay que llamar</option>
                <option value="pending">Pendientes de confirmar</option>
                <option value="confirmed">Confirmados</option>
                <option value="change-requested">Cambios solicitados</option>
                <option value="cancelled">Cancelados</option>
                <option value="attended">Asistió</option>
                <option value="no-show">No asistió</option>
              </select>
              <ChevronRight aria-hidden="true" className="pointer-events-none absolute right-3 size-4 rotate-90 text-muted-foreground" />
            </label>
          </div>
        </CardContent>
      </Card>

      <section aria-label={`Turnos para ${dayLabel}`} className="flex flex-col gap-3">
        {visibleAppointments.length ? visibleAppointments.map((appointment) => {
          const patient = patientById.get(appointment.patientId)
          if (!patient) return null
          const callReason = isEligible(appointment, now) ? appointment.callReason : undefined
          return (
            <Card key={appointment.id} className="rounded-[20px] border-border/80 bg-card shadow-[0_2px_12px_rgba(25,45,39,0.02)] transition-shadow hover:shadow-[0_8px_24px_rgba(25,45,39,0.06)]">
              <CardContent className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center xl:gap-4 xl:px-5">
                <div className="flex items-center gap-3 xl:w-[116px] xl:shrink-0 xl:gap-0">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f0f5f2] text-sm font-semibold tabular-nums text-[#356957]">{appointment.time}</span>
                  <div className="xl:hidden">
                    <p className="text-sm font-semibold">{patient.name}</p>
                    <p className="text-xs text-muted-foreground">{patient.phone}</p>
                  </div>
                </div>
                <div className="hidden min-w-0 flex-1 items-center gap-3 xl:flex">
                  <PatientAvatar name={patient.name} className="size-10 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{patient.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{patient.phone}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <AppointmentBadges appointment={appointment} />
                  <ReminderBadge state={appointment.reminder} />
                  {callReason && <CallReasonBadge reason={callReason} />}
                </div>
                <div className="flex items-center gap-2 sm:ml-1">
                  <Button variant="outline" size="sm" onClick={() => onOpenAppointment(appointment.id)} aria-label={`Ver detalle de ${patient.name}`} className="h-9 flex-1 rounded-lg sm:flex-none">
                    <Eye data-icon="inline-start" />
                    Ver detalle
                  </Button>
                </div>
              </CardContent>
              {appointment.state === "scheduled" && !patient.whatsappConsent && (
                <div className="border-t border-border/70 bg-[#fbfaf6] px-4 py-2.5 text-xs text-[#806e4d] sm:px-5">
                  WhatsApp deshabilitado: no hay autorización registrada.
                </div>
              )}
            </Card>
          )
        }) : (
          <Empty className="min-h-64 rounded-[22px] border border-dashed border-border bg-card/60">
            <EmptyHeader>
              <EmptyMedia variant="icon"><CalendarDays /></EmptyMedia>
              <EmptyTitle>No encontramos turnos</EmptyTitle>
              <EmptyDescription>
                {search || filter !== "all" ? "Probá con otro nombre o filtro." : `No hay turnos agendados para ${formatDateShort(selectedDate)}.`}
              </EmptyDescription>
            </EmptyHeader>
            {(search || filter !== "all") && <Button variant="outline" size="sm" onClick={() => { setSearch(""); setFilter("all") }}>Limpiar filtros</Button>}
          </Empty>
        )}
      </section>
    </div>
  )
}
