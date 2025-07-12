"use client"

import { useState } from "react"
import HistoricSessionSelector from "@/components/HistoricSessionSelector"
import TimelineScrubber from "@/components/TimelineScrubber"
import PlaybackControls from "@/components/PlaybackControls"
import SessionComparison from "@/components/SessionComparison"
import RaceProgressScrubBar from "@/components/RaceProgressScrubBar"
import { useHistoricTelemetry } from "@/lib/hooks/useHistoricTelemetry"
import { useHistoricPlayback } from "@/lib/hooks/useHistoricPlayback"

export default function HistoricViewPage() {
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const sessionKey = selectedSession?.session_key
  const {
    telemetry,
    current,
    currentIdx,
    setCurrentIdx,
    loading,
    error,
    min,
    max,
  } = useHistoricTelemetry(sessionKey)

  const {
    playing,
    toggle,
    speed,
    setSpeed,
    stepBack,
    stepForward,
    canStepBack,
    canStepForward,
    setCurrentIdx: setPlaybackIdx,
  } = useHistoricPlayback(max, {
    onFrame: setCurrentIdx,
  })

  // Sync timeline scrubber and playback
  const handleScrub = (idx: number) => {
    setCurrentIdx(idx)
    setPlaybackIdx(idx)
  }

  // Add state for lap scrubber
  const [scrubLap, setScrubLap] = useState(1)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Historic Telemetry View</h1>
      <HistoricSessionSelector onSelect={setSelectedSession} />
      <SessionComparison />
      {selectedSession && (
        <div className="mt-6 p-4 border rounded bg-muted">
          <div className="font-semibold">Selected Session:</div>
          <div>
            {selectedSession.session_name} ({selectedSession.session_type})
          </div>
          <div>
            {selectedSession.circuit_short_name || "Unknown Circuit"} |{" "}
            {selectedSession.country_name || "Unknown Country"} |{" "}
            {selectedSession.date_start?.slice(0, 10)}
          </div>
          <div className="mt-6 flex flex-col gap-4">
            {/* Race progress scrub bar with event markers */}
            <RaceProgressScrubBar
              sessionKey={sessionKey}
              value={scrubLap}
              onChange={setScrubLap}
            />
            <PlaybackControls
              playing={playing}
              onPlayPause={toggle}
              speed={speed}
              setSpeed={setSpeed}
              canStepBack={canStepBack}
              canStepForward={canStepForward}
              onStepBack={stepBack}
              onStepForward={stepForward}
            />
            <TimelineScrubber
              min={min}
              max={max}
              value={currentIdx}
              onChange={handleScrub}
              label="Telemetry Timeline"
            />
            {loading && (
              <div className="text-xs text-muted-foreground mt-2">
                Loading telemetry...
              </div>
            )}
            {error && (
              <div className="text-xs text-destructive mt-2">{error}</div>
            )}
            {current && (
              <div className="mt-4 text-sm">
                <pre className="bg-background p-2 rounded overflow-x-auto">
                  {JSON.stringify(current, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}