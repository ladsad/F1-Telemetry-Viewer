"use client"

import { Play, Pause, ChevronsRight, ChevronsLeft } from "lucide-react"

type PlaybackControlsProps = {
  playing: boolean
  onPlayPause: () => void
  speed: number
  setSpeed: (s: number) => void
  canStepBack?: boolean
  canStepForward?: boolean
  onStepBack?: () => void
  onStepForward?: () => void
}

const speeds = [0.25, 0.5, 1, 2, 4]

export default function PlaybackControls({
  playing,
  onPlayPause,
  speed,
  setSpeed,
  canStepBack,
  canStepForward,
  onStepBack,
  onStepForward,
}: PlaybackControlsProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        className="p-2 rounded hover:bg-accent disabled:opacity-50"
        onClick={onStepBack}
        disabled={!canStepBack}
        aria-label="Step Back"
        type="button"
      >
        <ChevronsLeft className="w-5 h-5" />
      </button>
      <button
        className="p-2 rounded hover:bg-accent"
        onClick={onPlayPause}
        aria-label={playing ? "Pause" : "Play"}
        type="button"
      >
        {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
      </button>
      <button
        className="p-2 rounded hover:bg-accent disabled:opacity-50"
        onClick={onStepForward}
        disabled={!canStepForward}
        aria-label="Step Forward"
        type="button"
      >
        <ChevronsRight className="w-5 h-5" />
      </button>
      <label className="ml-4 text-xs text-muted-foreground">
        Speed:
        <select
          className="ml-2 rounded px-1 py-0.5 text-xs bg-muted text-foreground"
          value={speed}
          onChange={e => setSpeed(Number(e.target.value))}
        >
          {speeds.map((s) => (
            <option key={s} value={s}>{s}x</option>
          ))}
        </select>
      </label>
    </div>
  )
}