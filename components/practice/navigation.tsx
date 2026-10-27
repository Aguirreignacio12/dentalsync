"use client"

import {
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  House,
  Stethoscope,
  UsersRound,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PatientAvatar } from "./status-badges"
import type { Section } from "./types"

type NavigationItem = {
  id: Section
  label: string
  icon: LucideIcon
}

const navigationItems: NavigationItem[] = [
  { id: "inicio", label: "Inicio", icon: House },
  { id: "turnos", label: "Turnos", icon: CalendarDays },
  { id: "seguimientos", label: "Seguimientos", icon: CheckCircle2 },
  { id: "pacientes", label: "Pacientes", icon: UsersRound },
]

function NavigationButton({
  item,
  activeSection,
  onSelect,
  compact = false,
}: {
  item: NavigationItem
  activeSection: Section
  onSelect: (section: Section) => void
  compact?: boolean
}) {
  const active = activeSection === item.id
  const Icon = item.icon

  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={() => onSelect(item.id)}
      className={compact
        ? `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`
        : `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "bg-white text-foreground shadow-[0_1px_3px_rgba(26,44,48,0.08)] ring-1 ring-border" : "text-muted-foreground hover:bg-white/70 hover:text-foreground"}`}
    >
      <Icon aria-hidden="true" className={compact ? "size-5" : "size-[18px]"} strokeWidth={active ? 2.2 : 1.8} />
      <span className={compact ? "truncate" : undefined}>{item.label}</span>
      {!compact && item.id === "turnos" && <span className="ml-auto size-1.5 rounded-full bg-primary" aria-label="Hay turnos para revisar" />}
    </button>
  )
}

export function Sidebar({
  activeSection,
  onSelect,
}: {
  activeSection: Section
  onSelect: (section: Section) => void
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] flex-col border-r border-border/80 bg-[#f8f8f5] px-4 py-5 lg:flex">
      <div className="flex items-center gap-3 px-2">
        <div className="flex size-10 items-center justify-center rounded-[14px] bg-primary text-primary-foreground shadow-sm">
          <Stethoscope aria-hidden="true" className="size-5" strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight text-foreground">Consultorio Dra. Laura</p>
          <p className="mt-0.5 text-[11px] font-medium tracking-[0.08em] text-muted-foreground">ASISTENTE DE AGENDA</p>
        </div>
      </div>

      <div className="mt-9 px-3 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground/75">ESPACIO DE TRABAJO</div>
      <nav aria-label="Navegación principal" className="mt-3 flex flex-col gap-1">
        {navigationItems.map((item) => (
          <NavigationButton key={item.id} item={item} activeSection={activeSection} onSelect={onSelect} />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-4">
        <div className="rounded-2xl border border-[#d9e7e1] bg-[#eef5f1] p-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#286554]">
            <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-[#6ea994] opacity-35" /><span className="relative inline-flex size-2 rounded-full bg-[#41866e]" /></span>
            Google Calendar · demo
          </div>
          <p className="mt-1.5 pl-4 text-[11px] leading-relaxed text-[#5e776d]">Última simulación hace 2 min</p>
        </div>

        <div className="flex items-center gap-3 border-t border-border/70 px-2 pt-4">
          <PatientAvatar name="Sofía Luna" className="size-9" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">Sofía Luna</p>
            <p className="text-xs text-muted-foreground">Asistente</p>
          </div>
          <span className="rounded-full bg-[#f4eddf] px-2 py-1 text-[10px] font-semibold text-[#8b7045]">Demo</span>
        </div>
      </div>
    </aside>
  )
}

export function MobileNavigation({
  activeSection,
  onSelect,
}: {
  activeSection: Section
  onSelect: (section: Section) => void
}) {
  return (
    <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border/80 bg-background/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5 shadow-[0_-6px_24px_rgba(30,48,43,0.05)] backdrop-blur lg:hidden">
      {navigationItems.map((item) => (
        <NavigationButton key={item.id} item={item} activeSection={activeSection} onSelect={onSelect} compact />
      ))}
    </nav>
  )
}

export function MobileBrand({ onHelp }: { onHelp: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 lg:hidden">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-primary text-primary-foreground">
          <Stethoscope aria-hidden="true" className="size-[18px]" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Consultorio Dra. Laura</p>
          <p className="text-[11px] text-muted-foreground">Asistente de agenda</p>
        </div>
      </div>
      <Button variant="ghost" size="icon" aria-label="Ayuda" onClick={onHelp}>
        <CircleHelp aria-hidden="true" />
      </Button>
    </div>
  )
}
