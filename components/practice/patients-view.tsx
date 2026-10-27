"use client"

import { useMemo, useState } from "react"
import { ChevronDown, Search, ShieldCheck, ShieldX, UsersRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { PatientAvatar } from "./status-badges"
import { formatDateShort } from "./formatters"
import type { DemoState } from "./types"

type ConsentFilter = "all" | "authorized" | "missing"

export function PatientsView({
  data,
  todayKey,
  onOpenPatient,
}: {
  data: DemoState
  todayKey: string
  onOpenPatient: (id: string) => void
}) {
  const [search, setSearch] = useState("")
  const [consentFilter, setConsentFilter] = useState<ConsentFilter>("all")
  const appointmentByPatient = useMemo(() => {
    const map = new Map<string, DemoState["appointments"]>()
    for (const appointment of data.appointments) {
      map.set(appointment.patientId, [...(map.get(appointment.patientId) ?? []), appointment])
    }
    return map
  }, [data.appointments])
  const visiblePatients = data.patients.filter((patient) => {
    const matchesName = !search.trim() || patient.name.toLocaleLowerCase("es-AR").includes(search.trim().toLocaleLowerCase("es-AR"))
    const matchesConsent = consentFilter === "all" || (consentFilter === "authorized" ? patient.whatsappConsent : !patient.whatsappConsent)
    return matchesName && matchesConsent
  })

  return (
    <div className="flex flex-col gap-6 sm:gap-7">
      <div>
        <p className="mb-2 text-[13px] font-medium text-muted-foreground">Directorio de contacto</p>
        <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.045em] text-foreground sm:text-[36px]">Pacientes</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Datos operativos mínimos para contactar y mantener los turnos al día.</p>
      </div>

      <Card className="rounded-[22px] border-border/80 bg-card shadow-[0_2px_12px_rgba(25,45,39,0.025)]">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="relative w-full sm:max-w-md">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar paciente…" aria-label="Buscar pacientes por nombre" className="h-10 rounded-xl pl-9" />
          </div>
          <label className="relative flex w-full items-center sm:w-[220px]">
            <span className="sr-only">Filtrar por permiso de WhatsApp</span>
            <ShieldCheck aria-hidden="true" className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
            <select
              aria-label="Filtrar por permiso de WhatsApp"
              value={consentFilter}
              onChange={(event) => setConsentFilter(event.target.value as ConsentFilter)}
              className="h-10 w-full appearance-none rounded-xl border border-input bg-background pl-9 pr-9 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              <option value="all">Todos los permisos</option>
              <option value="authorized">Con autorización</option>
              <option value="missing">Sin autorización</option>
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 size-4 text-muted-foreground" />
          </label>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{visiblePatients.length} {visiblePatients.length === 1 ? "paciente" : "pacientes"}</p>
        <p className="hidden text-xs text-muted-foreground sm:block">Los datos son de demostración y se guardan solo en este navegador.</p>
      </div>

      {visiblePatients.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visiblePatients.map((patient) => {
            const nextAppointment = (appointmentByPatient.get(patient.id) ?? [])
              .filter((appointment) => appointment.state === "scheduled" && appointment.date >= todayKey)
              .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0]
            const activeFollowUp = data.followUps.find((followUp) => followUp.patientId === patient.id && followUp.state !== "closed")
            return (
              <Card key={patient.id} className="rounded-[20px] border-border/80 bg-card shadow-[0_2px_12px_rgba(25,45,39,0.02)] transition-shadow hover:shadow-[0_8px_24px_rgba(25,45,39,0.06)]">
                <CardContent className="p-4 sm:p-5">
                  <button type="button" onClick={() => onOpenPatient(patient.id)} className="flex w-full items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <PatientAvatar name={patient.name} className="size-11 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">{patient.name}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{patient.phone}</span>
                    </span>
                    <span className="sr-only">Ver contacto</span>
                  </button>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    {patient.whatsappConsent ? (
                      <Badge variant="outline" className="status-badge status-success"><ShieldCheck data-icon="inline-start" />WhatsApp autorizado</Badge>
                    ) : (
                      <Badge variant="outline" className="status-badge status-warning"><ShieldX data-icon="inline-start" />Sin autorización</Badge>
                    )}
                    {activeFollowUp && <Badge variant="secondary" className="max-w-[44%] truncate text-[10px]">Seguimiento</Badge>}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3.5">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Próximo turno</p>
                      <p className="mt-1 truncate text-xs font-medium text-foreground">{nextAppointment ? `${formatDateShort(nextAppointment.date)} · ${nextAppointment.time}` : "Sin turno agendado"}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => onOpenPatient(patient.id)} className="h-8 shrink-0 rounded-lg px-2.5 text-xs text-primary">
                      Ver ficha <ChevronDown data-icon="inline-end" className="-rotate-90" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Empty className="min-h-64 rounded-[22px] border border-dashed border-border bg-card/60">
          <EmptyHeader>
            <EmptyMedia variant="icon"><UsersRound /></EmptyMedia>
            <EmptyTitle>No encontramos pacientes</EmptyTitle>
            <EmptyDescription>Probá con otro nombre o revisá el filtro de autorización.</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" size="sm" onClick={() => { setSearch(""); setConsentFilter("all") }}>Limpiar filtros</Button>
        </Empty>
      )}
    </div>
  )
}
