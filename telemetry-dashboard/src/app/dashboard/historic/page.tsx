"use client"

import { useState } from "react"
import HistoricSessionSelector from "@/components/HistoricSessionSelector"
import TimelineScrubber from "@/components/TimelineScrubber"
import PlaybackControls from "@/components/PlaybackControls"
import SessionComparison from "@/components/SessionComparison"
import RaceProgressScrubBar from "@/components/RaceProgressScrubBar"
import { useHistoricTelemetry } from "@/lib/hooks/useHistoricTelemetry"
import { useHistoricPlayback } from "@/lib/hooks/useHistoricPlayback"
import Header from "@/components/layout/Header"
import Sidebar from "@/components/layout/Sidebar"
import MobileNav from "@/components/layout/MobileNav"

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
    <>
      <Header />
      <div className="flex flex-col md:flex-row min-h-screen">
        <Sidebar />
        <div className="block md:hidden">
          <MobileNav />
        </div>
        <main className="flex-1 p-2 sm:p-4 md:p-6 w-full max-w-full overflow-x-hidden">
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-xl sm:text-2xl font-bold font-formula1">
                Historic Telemetry View
              </h1>
              <div className="text-xs sm:text-sm text-muted-foreground">
                Browse and analyze historical F1 data
              </div>
            </div>

            <div className="space-y-4">
              <HistoricSessionSelector onSelect={setSelectedSession} />
              <SessionComparison />
            </div>

            {selectedSession && (
              <div className="space-y-4 p-3 sm:p-4 border rounded bg-muted/30">
                <div className="space-y-2">
                  <div className="font-semibold text-sm sm:text-base">
                    Selected Session:
                  </div>
                  <div className="text-sm sm:text-base">
                    {selectedSession.session_name} ({selectedSession.session_type})
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground flex flex-col sm:flex-row sm:gap-2">
                    <span>
                      {selectedSession.circuit_short_name || "Unknown Circuit"}
                    </span>
                    <span className="hidden sm:inline">|</span>
                    <span>
                      {selectedSession.country_name || "Unknown Country"}
                    </span>
                    <span className="hidden sm:inline">|</span>
                    <span>{selectedSession.date_start?.slice(0, 10)}</span>
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  {/* Mobile-friendly race progress scrub bar */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Race Progress</h3>
                    <RaceProgressScrubBar
                      sessionKey={sessionKey}
                      value={scrubLap}
                      onChange={setScrubLap}
                    />
                  </div>

                  {/* Mobile-optimized playback controls */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Playback Controls</h3>
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
                  </div>

                  {/* Mobile-friendly timeline scrubber */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Timeline</h3>
                    <TimelineScrubber
                      min={min}
                      max={max}
                      value={currentIdx}
                      onChange={handleScrub}
                      label="Telemetry Timeline"
                    />
                  </div>

                  {loading && (
                    <div className="text-xs text-muted-foreground">
                      Loading telemetry...
                    </div>
                  )}
                  {error && (
                    <div className="text-xs text-destructive">{error}</div>
                  )}
                  {current && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Current Telemetry Data</h3>
                      <pre className="bg-background p-3 rounded text-xs overflow-x-auto max-h-64 overflow-y-auto border">
                        {JSON.stringify(current, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  )
}