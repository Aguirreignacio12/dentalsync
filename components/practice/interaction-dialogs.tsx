"use client"

import { useEffect, useState } from "react"
import {
  CalendarPlus2,
  Check,
  CheckCircle2,
  Clock3,
  MessageCircleMore,
  Phone,
  Send,
  ShieldAlert,
  UserRound,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { PatientAvatar } from "./status-badges"
import { addDays } from "./demo-data"
import { getFirstName } from "./formatters"
import type { DemoState, Patient } from "./types"

export type MessageTarget = { kind: "follow-up"; id: string } | null

export type SimulatedFollowUpResponse = "wants-to-schedule" | "no-response"
export type ContactOutcome = "wants-to-schedule" | "no-response" | "contact-later"

function firstName(patient?: Patient) {
  return patient ? getFirstName(patient.name) : "Hola"
}

export function SendWhatsAppDialog({
  target,
  data,
  onOpenChange,
  onSendFollowUp,
  onFollowUpResponse,
}: {
  target: MessageTarget
  data: DemoState
  onOpenChange: (open: boolean) => void
  onSendFollowUp: (id: string) => void
  onFollowUpResponse: (id: string, response: SimulatedFollowUpResponse) => void
}) {
  const [sent, setSent] = useState(false)
  const [response, setResponse] = useState<string | null>(null)

  useEffect(() => {
    setSent(false)
    setResponse(null)
  }, [target?.kind, target?.id])

  if (!target) return null

  const followUp = data.followUps.find((item) => item.id === target.id)
  const patient = data.patients.find((item) => item.id === followUp?.patientId)
  if (!patient) return null

  const preview = `Hola ${firstName(patient)}, te escribimos desde el consultorio de la Dra. Laura. Si querés coordinar tu próximo turno, respondé este mensaje y te ayudamos.`
  const canSend = patient.whatsappConsent && !sent

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          setSent(false)
          setResponse(null)
        }
        onOpenChange(open)
      }}
    >
      <DialogContent className="max-w-[calc(100%-1.25rem)] overflow-hidden rounded-[24px] border-border p-0 sm:max-w-[480px]">
        <div className="p-5 sm:p-6">
          <DialogHeader className="gap-1.5 pr-8">
            <div className="mb-1 flex size-10 items-center justify-center rounded-[14px] bg-primary/10 text-primary">
              <MessageCircleMore aria-hidden="true" className="size-5" />
            </div>
            <DialogTitle className="text-xl font-semibold tracking-tight">Contactar por seguimiento</DialogTitle>
            <DialogDescription>
              Revisá el contacto y el texto antes de simular el envío.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-border/80 bg-background p-3.5">
            <PatientAvatar name={patient.name} className="size-11" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{patient.name}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground"><Phone aria-hidden="true" className="size-3.5" />{patient.phone}</p>
            </div>
            <Badge variant="outline" className={patient.whatsappConsent ? "status-badge status-success" : "status-badge status-warning"}>
              {patient.whatsappConsent ? "Autorizado" : "Sin permiso"}
            </Badge>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">Vista previa</p>
              <Badge variant="secondary" className="rounded-full text-[10px] font-medium">Demo local</Badge>
            </div>
            <div className="rounded-2xl rounded-tl-md bg-[#eaf3ee] px-4 py-3.5 text-sm leading-relaxed text-[#24463a]">
              {preview}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">No se envía ningún mensaje real. El texto no incluye información clínica.</p>
          </div>

          {!patient.whatsappConsent && (
            <Alert className="mt-4 rounded-xl border-[#eadfc9] bg-[#fbf8f0] text-[#715d39]">
              <ShieldAlert aria-hidden="true" />
              <AlertTitle className="text-sm">Falta autorización</AlertTitle>
              <AlertDescription className="text-xs text-[#806e4d]">Registrá el permiso del paciente antes de contactarlo por WhatsApp.</AlertDescription>
            </Alert>
          )}

          {sent && (
            <Alert className="mt-4 rounded-xl border-[#d7e7df] bg-[#f1f7f3] text-[#315d4c]">
              <CheckCircle2 aria-hidden="true" />
              <AlertTitle className="text-sm">Mensaje simulado como entregado</AlertTitle>
              <AlertDescription className="text-xs text-[#5b7669]">El estado y el historial se actualizaron en esta demostración.</AlertDescription>
            </Alert>
          )}

          {sent && followUp && (
            <div className="mt-4 rounded-2xl border border-border/80 bg-background p-3.5">
              <p className="text-xs font-semibold text-foreground">Simular respuesta</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="h-9 rounded-lg text-xs" onClick={() => { onFollowUpResponse(followUp.id, "wants-to-schedule"); setResponse("Quiere coordinar un turno") }}>
                  <CalendarPlus2 data-icon="inline-start" />Quiero agendar
                </Button>
                <Button size="sm" variant="ghost" className="h-9 rounded-lg text-xs text-muted-foreground" onClick={() => { onFollowUpResponse(followUp.id, "no-response"); setResponse("Sin respuesta") }}>
                  Sin respuesta
                </Button>
              </div>
              {response && <p role="status" className="mt-3 text-xs font-medium text-primary">{response}.</p>}
            </div>
          )}
        </div>

        <DialogFooter className="border-border/70 bg-muted/35 p-4 sm:px-6">
          <Button variant="outline" className="h-10 rounded-xl" onClick={() => onOpenChange(false)}>Cerrar</Button>
          <Button
            className="h-10 rounded-xl"
            disabled={!canSend}
            onClick={() => {
              if (!patient.whatsappConsent) return
              if (followUp) onSendFollowUp(followUp.id)
              setSent(true)
            }}
          >
            {sent ? <Check data-icon="inline-start" /> : <Send data-icon="inline-start" />}
            {sent ? "Enviado en la demo" : "Simular envío"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function NewFollowUpDialog({
  open,
  onOpenChange,
  patients,
  todayKey,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  patients: Patient[]
  todayKey: string
  onCreate: (patientId: string, recommendedDate: string) => void
}) {
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "")
  const [recommendedDate, setRecommendedDate] = useState(addDays(todayKey, 7))

  useEffect(() => {
    if (!open) return
    setPatientId(patients[0]?.id ?? "")
    setRecommendedDate(addDays(todayKey, 7))
  }, [open, patients, todayKey])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-1.25rem)] rounded-[24px] border-border p-5 sm:max-w-[460px] sm:p-6">
        <DialogHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-[14px] bg-primary/10 text-primary">
            <UserRound aria-hidden="true" className="size-5" />
          </div>
          <DialogTitle className="text-xl font-semibold tracking-tight">Nuevo seguimiento</DialogTitle>
          <DialogDescription>Creá una tarea operativa indicada por la Dra. Laura. No agregues información clínica.</DialogDescription>
        </DialogHeader>
        <FieldGroup className="mt-2 gap-4">
          <Field>
            <FieldLabel htmlFor="follow-up-patient">Paciente</FieldLabel>
            <Select value={patientId} onValueChange={(value) => setPatientId(value ?? "")}>
              <SelectTrigger id="follow-up-patient" className="h-10 w-full rounded-xl">
                <SelectValue placeholder="Seleccionar paciente" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Directorio</SelectLabel>
                  {patients.map((patient) => <SelectItem key={patient.id} value={patient.id}>{patient.name}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription>La paciente o el paciente recibirá un mensaje solo si tiene permiso de WhatsApp registrado.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="follow-up-date">Fecha recomendada para revisar</FieldLabel>
            <Input id="follow-up-date" type="date" min={todayKey} value={recommendedDate} onChange={(event) => setRecommendedDate(event.target.value)} className="h-10 rounded-xl" />
          </Field>
        </FieldGroup>
        <DialogFooter className="mt-2 border-t-0 bg-transparent p-0 sm:justify-end">
          <Button variant="outline" className="h-10 rounded-xl" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="h-10 rounded-xl" disabled={!patientId || !recommendedDate} onClick={() => { onCreate(patientId, recommendedDate); onOpenChange(false) }}>
            <Check data-icon="inline-start" />Crear seguimiento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ScheduleSessionDialog({
  open,
  onOpenChange,
  patientName,
  recommendedDate,
  todayKey,
  onSchedule,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientName: string
  recommendedDate: string
  todayKey: string
  onSchedule: (date: string, time: string) => void
}) {
  const [date, setDate] = useState(recommendedDate >= todayKey ? recommendedDate : todayKey)
  const [time, setTime] = useState("10:30")

  useEffect(() => {
    if (!open) return
    setDate(recommendedDate >= todayKey ? recommendedDate : todayKey)
    setTime("10:30")
  }, [open, recommendedDate, todayKey])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-1.25rem)] rounded-[24px] border-border p-5 sm:max-w-[440px] sm:p-6">
        <DialogHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-[14px] bg-primary/10 text-primary"><CalendarPlus2 aria-hidden="true" className="size-5" /></div>
          <DialogTitle className="text-xl font-semibold tracking-tight">Agendar próxima sesión</DialogTitle>
          <DialogDescription>Se agregará un turno de demostración para {patientName}.</DialogDescription>
        </DialogHeader>
        <FieldGroup className="mt-2 gap-4">
          <Field>
            <FieldLabel htmlFor="session-date">Fecha</FieldLabel>
            <Input id="session-date" type="date" min={todayKey} value={date} onChange={(event) => setDate(event.target.value)} className="h-10 rounded-xl" />
          </Field>
          <Field>
            <FieldLabel htmlFor="session-time">Horario</FieldLabel>
            <Input id="session-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} className="h-10 rounded-xl" />
          </Field>
        </FieldGroup>
        <DialogFooter className="mt-2 border-t-0 bg-transparent p-0 sm:justify-end">
          <Button variant="outline" className="h-10 rounded-xl" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="h-10 rounded-xl" disabled={!date || !time} onClick={() => { onSchedule(date, time); onOpenChange(false) }}>
            <CalendarPlus2 data-icon="inline-start" />Guardar turno
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function RescheduleDialog({
  open,
  onOpenChange,
  patientName,
  currentDate,
  currentTime,
  todayKey,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientName: string
  currentDate: string
  currentTime: string
  todayKey: string
  onSave: (date: string, time: string) => void
}) {
  const [date, setDate] = useState(currentDate)
  const [time, setTime] = useState(currentTime)

  useEffect(() => {
    if (!open) return
    setDate(currentDate)
    setTime(currentTime)
  }, [open, currentDate, currentTime])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-1.25rem)] rounded-[24px] border-border p-5 sm:max-w-[440px] sm:p-6">
        <DialogHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-[14px] bg-primary/10 text-primary"><CalendarPlus2 aria-hidden="true" className="size-5" /></div>
          <DialogTitle className="text-xl font-semibold tracking-tight">Reprogramar turno</DialogTitle>
          <DialogDescription>Actualizá la agenda para {patientName}. En esta demo, el cambio es local.</DialogDescription>
        </DialogHeader>
        <FieldGroup className="mt-2 gap-4">
          <Field>
            <FieldLabel htmlFor="reschedule-date">Nueva fecha</FieldLabel>
            <Input id="reschedule-date" type="date" min={todayKey} value={date} onChange={(event) => setDate(event.target.value)} className="h-10 rounded-xl" />
          </Field>
          <Field>
            <FieldLabel htmlFor="reschedule-time">Nuevo horario</FieldLabel>
            <Input id="reschedule-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} className="h-10 rounded-xl" />
          </Field>
        </FieldGroup>
        <DialogFooter className="mt-2 border-t-0 bg-transparent p-0 sm:justify-end">
          <Button variant="outline" className="h-10 rounded-xl" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="h-10 rounded-xl" disabled={!date || !time} onClick={() => { onSave(date, time); onOpenChange(false) }}>
            <Check data-icon="inline-start" />Guardar cambio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ContactOutcomeDialog({
  open,
  onOpenChange,
  patientName,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientName: string
  onSelect: (outcome: ContactOutcome) => void
}) {
  const options: { value: ContactOutcome; label: string; description: string; icon: typeof Check }[] = [
    { value: "wants-to-schedule", label: "Quiere coordinar", description: "Dejar el seguimiento listo para agendar.", icon: CalendarPlus2 },
    { value: "no-response", label: "No respondió", description: "Registrar el intento y mantenerlo en espera.", icon: Clock3 },
    { value: "contact-later", label: "Contactar más adelante", description: "Dejar una nueva acción pendiente.", icon: Phone },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-1.25rem)] rounded-[24px] border-border p-5 sm:max-w-[460px] sm:p-6">
        <DialogHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-[14px] bg-primary/10 text-primary"><Phone aria-hidden="true" className="size-5" /></div>
          <DialogTitle className="text-xl font-semibold tracking-tight">Registrar contacto</DialogTitle>
          <DialogDescription>Elegí el resultado del contacto con {patientName}. No se guardan notas clínicas.</DialogDescription>
        </DialogHeader>
        <div className="mt-2 flex flex-col gap-2">
          {options.map((option) => {
            const Icon = option.icon
            return (
              <Button key={option.value} variant="outline" className="h-auto justify-start gap-3 rounded-xl px-3.5 py-3 text-left" onClick={() => { onSelect(option.value); onOpenChange(false) }}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-primary"><Icon aria-hidden="true" className="size-4" /></span>
                <span className="flex min-w-0 flex-col items-start gap-0.5">
                  <span className="text-sm font-semibold">{option.label}</span>
                  <span className="text-xs font-normal text-muted-foreground">{option.description}</span>
                </span>
              </Button>
            )
          })}
        </div>
        <DialogFooter className="border-t-0 bg-transparent p-0 sm:justify-end">
          <Button variant="ghost" className="rounded-xl" onClick={() => onOpenChange(false)}>Cancelar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
