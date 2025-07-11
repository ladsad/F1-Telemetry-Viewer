"use client"

import { useEffect, useState } from "react"
import { Slider } from "@/components/ui/slider"
import type { OpenF1SessionEvent, OpenF1LapInfo } from "@/lib/api/types"
import { OpenF1Service } from "@/lib/api/openf1"

type RaceProgressScrubBarProps = {
  sessionKey: string
  value: number
  onChange: (lap: number) => void
}

const EVENT_COLORS: Record<string, string> = {
  pit: "bg-yellow-400 border-yellow-600",
  safetycar: "bg-blue-400 border-blue-600",
  crash: "bg-red-500 border-red-700",
  vsc: "bg-green-400 border-green-600",
}

export default function RaceProgressScrubBar({
  sessionKey,
  value,
  onChange,
}: RaceProgressScrubBarProps) {
  const [lapInfo, setLapInfo] = useState<OpenF1LapInfo | null>(null)
  const [events, setEvents] = useState<OpenF1SessionEvent[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const openf1 = new OpenF1Service("https://api.openf1.org/v1")
    setLoading(true)
    Promise.all([
      openf1.getLapInfo(sessionKey),
      openf1.getSessionEvents(sessionKey),
    ])
      .then(([lapInfo, events]) => {
        setLapInfo(lapInfo)
        setEvents(events || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [sessionKey])

  if (!lapInfo) {
    return <div className="text-xs text-muted-foreground">Loading race progress...</div>
  }

  const totalLaps = lapInfo.totalLaps || 1

  // Map events to lap numbers for marker placement
  const lapMarkers = events.map((e, i) => {
    const lap = e.lap_number
    const percent = ((lap - 1) / (totalLaps - 1)) * 100
    return (
      <div
        key={i}
        className={`absolute top-0 h-3 w-2 rounded ${EVENT_COLORS[e.type] || "bg-gray-400 border-gray-600"} border-2`}
        style={{ left: `calc(${percent}% - 1px)` }}
        title={`${e.type.toUpperCase()} - Lap ${lap}${e.description ? ": " + e.description : ""}`}
      />
    )
  })

  return (
    <div className="relative w-full my-4">
      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
        <span>Lap 1</span>
        <span>Lap {totalLaps}</span>
      </div>
      <div className="relative h-6">
        <Slider
          min={1}
          max={totalLaps}
          step={1}
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          className="z-10"
        />
        {/* Event markers */}
        <div className="absolute left-0 top-1 w-full h-3 pointer-events-none z-0">
          {lapMarkers}
        </div>
      </div>
      <div className="flex gap-3 mt-2 text-xs">
        {Object.entries(EVENT_COLORS).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1">
            <span className={`inline-block w-3 h-3 rounded ${color}`} />
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </span>
        ))}
      </div>
      {loading && <div className="text-xs text-muted-foreground mt-2">Loading events...</div>}
    </div>
  )
}