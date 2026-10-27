"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarDays, CheckCircle2, Database, RotateCcw, Wifi } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/sonner"
import { AppointmentsView } from "./appointments-view"
import { createDemoState } from "./demo-data"
import { formatRelativeDate } from "./formatters"
import { DetailDrawer } from "./detail-drawer"
import { DashboardView } from "./dashboard-view"
import {
  ContactOutcomeDialog,
  NewFollowUpDialog,
  RescheduleDialog,
  ScheduleSessionDialog,
  SendWhatsAppDialog,
  type ContactOutcome,
  type MessageTarget,
  type SimulatedAppointmentResponse,
  type SimulatedFollowUpResponse,
} from "./interaction-dialogs"
import { FollowUpsView } from "./follow-ups-view"
import { MobileBrand, MobileNavigation, Sidebar } from "./navigation"
import { PatientsView } from "./patients-view"
import type { Appointment, Communication, DemoState, DetailTarget, FollowUp, FollowUpActivity, Section } from "./types"

const STORAGE_KEY_PREFIX = "dra-laura-agenda-demo-v1"

type FollowUpScheduleTarget = { id: string; patientName: string; recommendedDate: string } | null

type ContactTarget = { id: string; patientName: string } | null

function isDemoState(value: unknown): value is DemoState {
  if (!value || typeof value !== "object") return false
  const candidate = value as Partial<DemoState>
  return Array.isArray(candidate.patients)
    && Array.isArray(candidate.appointments)
    && Array.isArray(candidate.followUps)
    && Array.isArray(candidate.communications)
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function createActivity(label: string, kind: FollowUpActivity["kind"], detail?: string): FollowUpActivity {
  return { id: makeId("activity"), label, kind, detail, at: new Date().toISOString() }
}

function createSystemCommunication(patientId: string, text: string, relation: { appointmentId?: string; followUpId?: string } = {}): Communication {
  return {
    id: makeId("communication"),
    patientId,
    ...relation,
    direction: "system",
    kind: "contact",
    text,
    status: "logged",
    at: new Date().toISOString(),
  }
}

export function PracticeWorkspace({ todayKey, greeting }: { todayKey: string; greeting: string }) {
  const [data, setData] = useState<DemoState>(() => createDemoState(todayKey))
  const [hasHydrated, setHasHydrated] = useState(false)
  const [activeSection, setActiveSection] = useState<Section>("inicio")
  const [detailTarget, setDetailTarget] = useState<DetailTarget>(null)
  const [messageTarget, setMessageTarget] = useState<MessageTarget>(null)
  const [newFollowUpOpen, setNewFollowUpOpen] = useState(false)
  const [rescheduleId, setRescheduleId] = useState<string | null>(null)
  const [scheduleFollowUpId, setScheduleFollowUpId] = useState<string | null>(null)
  const [contactFollowUpId, setContactFollowUpId] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncLabel, setLastSyncLabel] = useState("Hace 2 min")
  const storageKey = `${STORAGE_KEY_PREFIX}-${todayKey}`

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey)
      if (saved) {
        const parsed: unknown = JSON.parse(saved)
        if (isDemoState(parsed)) setData(parsed)
      }
    } catch {
      toast.error("No pudimos recuperar el estado de esta demo", { description: "Se cargaron los datos de ejemplo." })
    } finally {
      setHasHydrated(true)
    }
  }, [storageKey])

  useEffect(() => {
    if (!hasHydrated) return
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(data))
    } catch {
      toast.error("No se pudo guardar el estado local", { description: "La demo seguirá funcionando hasta que cierres esta pestaña." })
    }
  }, [data, hasHydrated, storageKey])

  const patientById = useMemo(() => new Map(data.patients.map((patient) => [patient.id, patient])), [data.patients])
  const rescheduleAppointment = rescheduleId ? data.appointments.find((item) => item.id === rescheduleId) : undefined
  const reschedulePatient = rescheduleAppointment ? patientById.get(rescheduleAppointment.patientId) : undefined
  const scheduleTarget: FollowUpScheduleTarget = scheduleFollowUpId ? (() => {
    const followUp = data.followUps.find((item) => item.id === scheduleFollowUpId)
    const patient = followUp ? patientById.get(followUp.patientId) : undefined
    return followUp && patient ? { id: followUp.id, patientName: patient.name, recommendedDate: followUp.recommendedDate } : null
  })() : null
  const contactTarget: ContactTarget = contactFollowUpId ? (() => {
    const followUp = data.followUps.find((item) => item.id === contactFollowUpId)
    const patient = followUp ? patientById.get(followUp.patientId) : undefined
    return followUp && patient ? { id: followUp.id, patientName: patient.name } : null
  })() : null

  function navigateToSection(section: Section) {
    setActiveSection(section)
    window.scrollTo({ top: 0, behavior: "instant" })
  }

  function openMessage(target: Exclude<MessageTarget, null>) {
    setMessageTarget(target)
  }

  function sendAppointmentReminder(appointmentId: string) {
    const appointment = data.appointments.find((item) => item.id === appointmentId)
    const patient = appointment ? patientById.get(appointment.patientId) : undefined
    if (!appointment || !patient) return
    if (!patient.whatsappConsent) {
      toast.error("No hay autorización para WhatsApp", { description: "Usá el canal habitual del consultorio." })
      return
    }
    const relativeDate = formatRelativeDate(appointment.date, todayKey)
    const communication: Communication = {
      id: makeId("message"),
      patientId: patient.id,
      appointmentId,
      direction: "outbound",
      kind: "reminder",
      text: `Recordatorio de turno para ${relativeDate} a las ${appointment.time}.`,
      status: "delivered",
      at: new Date().toISOString(),
    }
    setData((current) => ({
      ...current,
      appointments: current.appointments.map((item) => item.id === appointmentId
        ? { ...item, reminder: "delivered", reminderSentAt: communication.at }
        : item),
      communications: [communication, ...current.communications],
    }))
    toast.success("Recordatorio simulado", { description: `El historial de ${patient.name} se actualizó.` })
  }

  function sendFollowUpMessage(followUpId: string) {
    const followUp = data.followUps.find((item) => item.id === followUpId)
    const patient = followUp ? patientById.get(followUp.patientId) : undefined
    if (!followUp || !patient) return
    if (!patient.whatsappConsent) {
      toast.error("No hay autorización para WhatsApp", { description: "Usá el canal habitual del consultorio." })
      return
    }
    const now = new Date().toISOString()
    const communication: Communication = {
      id: makeId("message"),
      patientId: patient.id,
      followUpId,
      direction: "outbound",
      kind: "follow-up",
      text: `Hola ${patient.name.split(" ")[0]}, te escribimos desde el consultorio de la Dra. Laura. Si querés coordinar tu próximo turno, respondé este mensaje y te ayudamos.`,
      status: "delivered",
      at: now,
    }
    setData((current) => ({
      ...current,
      followUps: current.followUps.map((item) => item.id === followUpId
        ? { ...item, state: "message-sent", activities: [...item.activities, { id: makeId("activity"), label: "Mensaje enviado", detail: "Se consultó si quería coordinar su próximo turno", at: now, kind: "message" }] }
        : item),
      communications: [communication, ...current.communications],
    }))
    toast.success("Mensaje de seguimiento simulado", { description: `Se actualizó el historial de ${patient.name}.` })
  }

  function recordAppointmentResponse(appointmentId: string, response: SimulatedAppointmentResponse) {
    const appointment = data.appointments.find((item) => item.id === appointmentId)
    const patient = appointment ? patientById.get(appointment.patientId) : undefined
    if (!appointment || !patient) return
    const responseDetails: Record<SimulatedAppointmentResponse, { confirmation: Appointment["confirmation"]; text: string; label: string }> = {
      confirmed: { confirmation: "confirmed", text: "Confirmo mi turno.", label: "Turno confirmado" },
      reschedule: { confirmation: "reschedule-requested", text: "¿Podemos reprogramar el turno?", label: "Solicitud de reprogramación registrada" },
      cancel: { confirmation: "cancel-requested", text: "Necesito cancelar el turno.", label: "Solicitud de cancelación registrada" },
      "no-response": { confirmation: appointment.confirmation, text: "No se registró respuesta en la simulación.", label: "Sin respuesta: el turno sigue pendiente" },
    }
    const details = responseDetails[response]
    const now = new Date().toISOString()
    const communication: Communication = {
      id: makeId(response === "no-response" ? "log" : "response"),
      patientId: patient.id,
      appointmentId,
      direction: response === "no-response" ? "system" : "inbound",
      kind: response === "no-response" ? "contact" : "response",
      text: details.text,
      status: response === "no-response" ? "logged" : "received",
      at: now,
    }
    setData((current) => ({
      ...current,
      appointments: current.appointments.map((item) => item.id === appointmentId
        ? { ...item, confirmation: details.confirmation }
        : item),
      communications: [communication, ...current.communications],
    }))
    toast.success(details.label)
  }

  function recordFollowUpResponse(followUpId: string, response: SimulatedFollowUpResponse) {
    const followUp = data.followUps.find((item) => item.id === followUpId)
    const patient = followUp ? patientById.get(followUp.patientId) : undefined
    if (!followUp || !patient) return
    const now = new Date().toISOString()
    const wantsToSchedule = response === "wants-to-schedule"
    const label = wantsToSchedule ? "Respondió: quiere coordinar un turno" : "No hubo respuesta registrada"
    const communication = createSystemCommunication(patient.id, label, { followUpId })
    setData((current) => ({
      ...current,
      followUps: current.followUps.map((item) => item.id === followUpId
        ? { ...item, state: wantsToSchedule ? "contact-pending" : "waiting-response", activities: [...item.activities, { id: makeId("activity"), label, at: now, kind: wantsToSchedule ? "response" : "contact" }] }
        : item),
      communications: [communication, ...current.communications],
    }))
    toast.success(wantsToSchedule ? "Respuesta registrada: quiere coordinar" : "Sin respuesta simulada")
  }

  function createFollowUp(patientId: string, recommendedDate: string) {
    const duplicate = data.followUps.some((item) => item.patientId === patientId && item.state !== "closed")
    if (duplicate) {
      const patient = patientById.get(patientId)
      toast.error("Ya hay un seguimiento abierto", { description: patient?.name ?? "Revisá el seguimiento existente." })
      return
    }
    const now = new Date().toISOString()
    const followUp: FollowUp = {
      id: makeId("follow-up"),
      patientId,
      lastAppointmentDate: todayKey,
      recommendedDate,
      state: "next-session-pending",
      activities: [{ id: makeId("activity"), label: "Seguimiento abierto", detail: "Indicado por la Dra. Laura", at: now, kind: "created" }],
    }
    setData((current) => ({ ...current, followUps: [followUp, ...current.followUps] }))
    setDetailTarget({ kind: "follow-up", id: followUp.id })
    toast.success("Seguimiento creado", { description: "La tarea quedó en la lista de acciones." })
  }

  function scheduleFollowUp(date: string, time: string) {
    if (!scheduleFollowUpId) return
    const followUp = data.followUps.find((item) => item.id === scheduleFollowUpId)
    if (!followUp) return
    const appointment: Appointment = {
      id: makeId("appointment"),
      patientId: followUp.patientId,
      date,
      time,
      confirmation: "pending",
      state: "scheduled",
      attendance: "unknown",
      reminder: "not-sent",
    }
    const now = new Date().toISOString()
    setData((current) => ({
      ...current,
      appointments: [...current.appointments, appointment],
      followUps: current.followUps.map((item) => item.id === followUp.id
        ? { ...item, state: "scheduled", nextAppointmentId: appointment.id, needsReview: false, activities: [...item.activities, { id: makeId("activity"), label: "Próximo turno agendado", detail: `${date} · ${time}`, at: now, kind: "scheduled" }] }
        : item),
    }))
    setScheduleFollowUpId(null)
    toast.success("Turno agregado a la demo", { description: "El seguimiento quedó marcado como agendado." })
  }

  function recordContactOutcome(outcome: ContactOutcome) {
    if (!contactFollowUpId) return
    const followUp = data.followUps.find((item) => item.id === contactFollowUpId)
    if (!followUp) return
    const details: Record<ContactOutcome, { state: FollowUp["state"]; label: string; detail: string }> = {
      "wants-to-schedule": { state: "contact-pending", label: "Contacto registrado", detail: "Quiere coordinar su próximo turno." },
      "no-response": { state: "waiting-response", label: "Intento de contacto sin respuesta", detail: "Se mantiene en espera para un nuevo intento." },
      "contact-later": { state: "contact-pending", label: "Contacto pendiente", detail: "Se acordó volver a contactar más adelante." },
    }
    const result = details[outcome]
    const now = new Date().toISOString()
    const activity = { id: makeId("activity"), label: result.label, detail: result.detail, at: now, kind: "contact" as const }
    const communication = createSystemCommunication(followUp.patientId, result.detail, { followUpId: followUp.id })
    setData((current) => ({
      ...current,
      followUps: current.followUps.map((item) => item.id === followUp.id
        ? { ...item, state: result.state, activities: [...item.activities, activity] }
        : item),
      communications: [communication, ...current.communications],
    }))
    setContactFollowUpId(null)
    toast.success(result.label)
  }

  function closeFollowUp(followUpId: string) {
    const now = new Date().toISOString()
    setData((current) => ({
      ...current,
      followUps: current.followUps.map((item) => item.id === followUpId
        ? { ...item, state: "closed", needsReview: false, activities: [...item.activities, { id: makeId("activity"), label: "Seguimiento cerrado por la odontóloga", detail: "Cierre manual registrado", at: now, kind: "closed" }] }
        : item),
    }))
    toast.success("Seguimiento cerrado")
  }

  function toggleFollowUpReview(followUpId: string) {
    const followUp = data.followUps.find((item) => item.id === followUpId)
    if (!followUp || followUp.state === "closed") return
    const needsReview = !followUp.needsReview
    const now = new Date().toISOString()
    const label = needsReview ? "Marcado para revisión" : "Se quitó la marca de revisión"
    const detail = needsReview ? "La asistente dejó este seguimiento señalado para una revisión manual." : "La marca de revisión se quitó desde la lista operativa."

    setData((current) => ({
      ...current,
      followUps: current.followUps.map((item) => item.id === followUpId
        ? { ...item, needsReview, activities: [...item.activities, { id: makeId("activity"), label, detail, at: now, kind: "review" }] }
        : item),
    }))
    toast.success(needsReview ? "Seguimiento marcado para revisión" : "Marca de revisión quitada")
  }

  function confirmAppointment(appointmentId: string) {
    const appointment = data.appointments.find((item) => item.id === appointmentId)
    if (!appointment) return
    const communication = createSystemCommunication(appointment.patientId, "Confirmación registrada por la asistente.", { appointmentId })
    setData((current) => ({
      ...current,
      appointments: current.appointments.map((item) => item.id === appointmentId ? { ...item, confirmation: "confirmed" } : item),
      communications: [communication, ...current.communications],
    }))
    toast.success("Turno marcado como confirmado")
  }

  function cancelAppointment(appointmentId: string) {
    const appointment = data.appointments.find((item) => item.id === appointmentId)
    if (!appointment) return
    const communication = createSystemCommunication(appointment.patientId, "Cancelación registrada por la asistente.", { appointmentId })
    setData((current) => ({
      ...current,
      appointments: current.appointments.map((item) => item.id === appointmentId
        ? { ...item, state: "cancelled", attendance: "cancelled" }
        : item),
      followUps: current.followUps.map((item) => item.nextAppointmentId === appointmentId
        ? { ...item, state: "contact-pending", nextAppointmentId: undefined, activities: [...item.activities, { id: makeId("activity"), label: "Turno cancelado", detail: "Revisar si hace falta coordinar otro horario.", at: new Date().toISOString(), kind: "contact" }] }
        : item),
      communications: [communication, ...current.communications],
    }))
    toast.success("Turno cancelado en la demo")
  }

  function setAttendance(appointmentId: string, attendance: "attended" | "no-show") {
    const appointment = data.appointments.find((item) => item.id === appointmentId)
    if (!appointment) return
    const label = attendance === "attended" ? "Asistencia registrada: asistió." : "Asistencia registrada: no asistió."
    const communication = createSystemCommunication(appointment.patientId, label, { appointmentId })
    setData((current) => ({
      ...current,
      appointments: current.appointments.map((item) => item.id === appointmentId ? { ...item, attendance } : item),
      communications: [communication, ...current.communications],
    }))
    toast.success(attendance === "attended" ? "Asistencia registrada" : "Inasistencia registrada")
  }

  function saveReschedule(date: string, time: string) {
    if (!rescheduleAppointment) return
    const now = new Date().toISOString()
    const communication = createSystemCommunication(rescheduleAppointment.patientId, `Turno actualizado en la demo para ${date} a las ${time}.`, { appointmentId: rescheduleAppointment.id })
    setData((current) => ({
      ...current,
      appointments: current.appointments.map((item) => item.id === rescheduleAppointment.id
        ? { ...item, date, time, state: "scheduled", confirmation: "pending", attendance: "unknown", reminder: "not-sent", reminderSentAt: undefined }
        : item),
      communications: [communication, ...current.communications],
    }))
    setRescheduleId(null)
    toast.success("Turno reprogramado", { description: "Se limpió la confirmación para el nuevo horario." })
  }

  function syncCalendar() {
    if (syncing) return
    setSyncing(true)
    window.setTimeout(() => {
      setSyncing(false)
      setLastSyncLabel("Ahora")
      toast.success("Simulación actualizada", { description: "La agenda de demostración se actualizó; no se consultó Google Calendar." })
    }, 850)
  }

  function resetDemo() {
    setData(createDemoState(todayKey))
    setActiveSection("inicio")
    setDetailTarget(null)
    setMessageTarget(null)
    try {
      window.localStorage.removeItem(storageKey)
    } catch {
      // The in-memory reset still works if browser storage is unavailable.
    }
    toast.success("Datos de demostración restablecidos")
  }

  const selectedContact = contactFollowUpId ? data.followUps.find((item) => item.id === contactFollowUpId) : undefined
  const selectedContactName = selectedContact ? patientById.get(selectedContact.patientId)?.name ?? "el paciente" : "el paciente"

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar activeSection={activeSection} onSelect={navigateToSection} />

      <div className="min-h-screen lg:pl-[252px]">
        <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 backdrop-blur-xl">
          <div className="mx-auto flex min-h-[68px] max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
            <MobileBrand onHelp={() => toast.info("Prototipo interactivo", { description: "Los datos y mensajes son simulados y se guardan en este navegador." })} />
            <div className="hidden min-w-0 items-center gap-2 lg:flex">
              <span className="text-sm font-medium text-foreground">Operación diaria</span>
              <span className="text-muted-foreground/50" aria-hidden="true">/</span>
              <span className="text-sm text-muted-foreground">Consultorio Dra. Laura</span>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-[#dce9e1] bg-[#f1f7f3] px-3 py-1.5 text-xs font-medium text-[#376956] sm:flex">
                <Wifi aria-hidden="true" className="size-3.5" />
                <span>Google Calendar · demo</span>
                <span className="text-[#6d8d7d]">· {lastSyncLabel}</span>
              </div>
              <Badge variant="outline" className="rounded-full border-[#eadfc9] bg-[#fbf8f0] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-[#806e4d]">DEMO</Badge>
              <div className="hidden size-9 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold text-primary sm:flex" aria-label="Sofía Luna">SL</div>
              <Button variant="ghost" size="icon-sm" aria-label="Restablecer datos de demostración" title="Restablecer demo" onClick={resetDemo} className="rounded-lg text-muted-foreground">
                <RotateCcw aria-hidden="true" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 pb-2 text-[11px] text-muted-foreground sm:hidden">
            <Wifi aria-hidden="true" className="size-3.5 text-primary" />
            Google Calendar · demo · {lastSyncLabel}
            <span className="ml-auto inline-flex items-center gap-1"><Database aria-hidden="true" className="size-3" />Guardado localmente</span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 pb-28 sm:px-6 sm:py-8 sm:pb-28 lg:px-10 lg:pb-10">
          {activeSection === "inicio" && (
            <DashboardView
              data={data}
              todayKey={todayKey}
              greeting={greeting}
              onOpenAppointment={(id) => setDetailTarget({ kind: "appointment", id })}
              onOpenFollowUp={(id) => setDetailTarget({ kind: "follow-up", id })}
              onSendReminder={(id) => openMessage({ kind: "appointment", id })}
              onNewFollowUp={() => setNewFollowUpOpen(true)}
              onSelectAppointments={() => navigateToSection("turnos")}
              onSync={syncCalendar}
              syncing={syncing}
            />
          )}
          {activeSection === "turnos" && (
            <AppointmentsView
              data={data}
              todayKey={todayKey}
              onOpenAppointment={(id) => setDetailTarget({ kind: "appointment", id })}
              onSendReminder={(id) => openMessage({ kind: "appointment", id })}
              onSync={syncCalendar}
              syncing={syncing}
            />
          )}
          {activeSection === "seguimientos" && (
            <FollowUpsView
              data={data}
              todayKey={todayKey}
              onOpenFollowUp={(id) => setDetailTarget({ kind: "follow-up", id })}
              onSendMessage={(id) => openMessage({ kind: "follow-up", id })}
              onSchedule={(id) => setScheduleFollowUpId(id)}
              onContact={(id) => setContactFollowUpId(id)}
              onToggleReview={toggleFollowUpReview}
              onClose={closeFollowUp}
              onNewFollowUp={() => setNewFollowUpOpen(true)}
            />
          )}
          {activeSection === "pacientes" && (
            <PatientsView
              data={data}
              todayKey={todayKey}
              onOpenPatient={(id) => setDetailTarget({ kind: "patient", id })}
            />
          )}
        </main>
      </div>

      <MobileNavigation activeSection={activeSection} onSelect={navigateToSection} />

      <DetailDrawer
        target={detailTarget}
        data={data}
        todayKey={todayKey}
        onClose={() => setDetailTarget(null)}
        onOpenAppointment={(id) => id && setDetailTarget({ kind: "appointment", id })}
        onOpenFollowUp={(id) => setDetailTarget({ kind: "follow-up", id })}
        onSendMessage={openMessage}
        onConfirmAppointment={confirmAppointment}
        onCancelAppointment={cancelAppointment}
        onSetAttendance={setAttendance}
        onReschedule={(id) => setRescheduleId(id)}
        onContactFollowUp={(id) => setContactFollowUpId(id)}
        onScheduleFollowUp={(id) => setScheduleFollowUpId(id)}
        onCloseFollowUp={closeFollowUp}
      />

      <SendWhatsAppDialog
        key={messageTarget ? `${messageTarget.kind}-${messageTarget.id}` : "message-dialog"}
        target={messageTarget}
        data={data}
        todayKey={todayKey}
        onOpenChange={(open) => { if (!open) setMessageTarget(null) }}
        onSendAppointment={sendAppointmentReminder}
        onSendFollowUp={sendFollowUpMessage}
        onAppointmentResponse={recordAppointmentResponse}
        onFollowUpResponse={recordFollowUpResponse}
      />

      <NewFollowUpDialog
        open={newFollowUpOpen}
        onOpenChange={setNewFollowUpOpen}
        patients={data.patients}
        todayKey={todayKey}
        onCreate={createFollowUp}
      />

      <RescheduleDialog
        key={rescheduleAppointment?.id ?? "no-reschedule"}
        open={!!rescheduleId}
        onOpenChange={(open) => { if (!open) setRescheduleId(null) }}
        patientName={reschedulePatient?.name ?? "el paciente"}
        currentDate={rescheduleAppointment?.date ?? todayKey}
        currentTime={rescheduleAppointment?.time ?? "10:00"}
        todayKey={todayKey}
        onSave={saveReschedule}
      />

      <ScheduleSessionDialog
        key={scheduleTarget?.id ?? "no-schedule"}
        open={!!scheduleTarget}
        onOpenChange={(open) => { if (!open) setScheduleFollowUpId(null) }}
        patientName={scheduleTarget?.patientName ?? "el paciente"}
        recommendedDate={scheduleTarget?.recommendedDate ?? todayKey}
        todayKey={todayKey}
        onSchedule={scheduleFollowUp}
      />

      <ContactOutcomeDialog
        open={!!contactTarget}
        onOpenChange={(open) => { if (!open) setContactFollowUpId(null) }}
        patientName={selectedContactName}
        onSelect={recordContactOutcome}
      />

      <Toaster position="top-right" />
    </div>
  )
}
