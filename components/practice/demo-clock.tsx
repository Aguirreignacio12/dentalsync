"use client"

import { Clock3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatTimestamp } from "./formatters"

const steps = [1, 6, 24] as const

export function DemoClock({ now, onAdvance }: { now: string; onAdvance: (hours: 1 | 6 | 24) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock3 aria-hidden="true" className="size-3.5" />
        Reloj de demo
        <span className="font-semibold tabular-nums text-foreground">{formatTimestamp(now)}</span>
      </p>
      <div className="flex items-center gap-1">
        {steps.map((hours) => (
          <Button
            key={hours}
            variant="outline"
            size="sm"
            aria-label={`Adelantar el reloj de demo ${hours} ${hours === 1 ? "hora" : "horas"}`}
            onClick={() => onAdvance(hours)}
            className="h-9 rounded-lg px-2.5 text-xs tabular-nums"
          >
            +{hours} h
          </Button>
        ))}
      </div>
    </div>
  )
}
