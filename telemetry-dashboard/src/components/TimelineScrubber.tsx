"use client"

import { Slider } from "@/components/ui/slider"

type TimelineScrubberProps = {
  min: number
  max: number
  value: number
  onChange: (value: number) => void
  label?: string
  marks?: number[]
}

export default function TimelineScrubber({
  min,
  max,
  value,
  onChange,
  label,
  marks,
}: TimelineScrubberProps) {
  return (
    <div className="w-full flex flex-col gap-2">
      {label && <div className="text-xs text-muted-foreground">{label}</div>}
      <Slider
        min={min}
        max={max}
        step={1}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      />
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}