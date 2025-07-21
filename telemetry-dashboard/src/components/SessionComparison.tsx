"use client"

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { OpenF1Service } from "@/lib/api/openf1";
import HistoricSessionSelector from "@/components/HistoricSessionSelector";
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { SessionComparisonProps, SessionInfo } from "@/types";

type Session = {
  session_key: string
  session_name: string
  session_type: string
  date_start: string
  circuit_short_name?: string
  country_name?: string
  season: number
  round_number: number
}

type Telemetry = {
  speed: number
  throttle: number
  brake: number
  gear: number
  drs: boolean
  rpm: number
  [key: string]: any
}

export default function SessionComparison({ 
  selectedSessions = [], 
  metricType = 'lap_time' 
}: SessionComparisonProps) {
  const [selected, setSelected] = useState<Session[]>(selectedSessions)
  const [telemetry, setTelemetry] = useState<Record<string, Telemetry[]>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Add a session to compare
  const handleAddSession = (session: Session) => {
    if (!selected.find(s => s.session_key === session.session_key)) {
      setSelected([...selected, session])
    }
  }

  // Remove a session from comparison
  const handleRemoveSession = (sessionKey: string) => {
    setSelected(selected.filter(s => s.session_key !== sessionKey))
    setTelemetry(prev => {
      const copy = { ...prev }
      delete copy[sessionKey]
      return copy
    })
  }

  // Fetch telemetry for all selected sessions
  useEffect(() => {
    if (selected.length === 0) return
    setLoading(true)
    setError(null)
    const openf1 = new OpenF1Service("https://api.openf1.org/v1")
    Promise.all(
      selected.map(async (session) => {
        try {
          const data = await openf1.getCarTelemetry(session.session_key)
          return { key: session.session_key, data }
        } catch (err) {
          setError((err as Error).message)
          return { key: session.session_key, data: [] }
        }
      })
    ).then(results => {
      const merged: Record<string, Telemetry[]> = {}
      results.forEach(({ key, data }) => {
        merged[key] = data
      })
      setTelemetry(merged)
      setLoading(false)
    })
  }, [selected])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Comparison Tool</CardTitle>
      </CardHeader>
      <CardContent>
        <HistoricSessionSelector onSelect={handleAddSession} />
        <div className="flex flex-wrap gap-4 mt-4">
          {selected.map(session => (
            <div key={session.session_key} className="border rounded p-2 bg-muted min-w-[220px]">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-sm">{session.session_name}</span>
                <button
                  className="ml-2 text-xs text-destructive hover:underline"
                  onClick={() => handleRemoveSession(session.session_key)}
                >
                  Remove
                </button>
              </div>
              <div className="text-xs text-muted-foreground mb-1">
                {session.circuit_short_name || "Unknown Circuit"} | {session.country_name || "Unknown Country"}
              </div>
              <div className="text-xs text-muted-foreground mb-1">
                {session.session_type} | {session.date_start?.slice(0, 10)}
              </div>
              <div className="text-xs">
                {telemetry[session.session_key]
                  ? `Telemetry points: ${telemetry[session.session_key].length}`
                  : "No data"}
              </div>
            </div>
          ))}
        </div>
        {loading && <div className="text-muted-foreground text-sm mt-4">Loading telemetry...</div>}
        {error && <div className="text-destructive text-sm mt-4">{error}</div>}
        {selected.length > 1 && (
          <div className="mt-6">
            {/* Example: Compare average speed */}
            <div className="font-semibold mb-2">Average Speed Comparison</div>
            <div className="flex gap-6">
              {selected.map(session => {
                const data = telemetry[session.session_key] || []
                const avgSpeed =
                  data.length > 0
                    ? (data.reduce((sum, t) => sum + (t.speed || 0), 0) / data.length).toFixed(1)
                    : "-"
                return (
                  <div key={session.session_key} className="flex flex-col items-center">
                    <span className="font-bold">{avgSpeed} km/h</span>
                    <span className="text-xs text-muted-foreground">{session.session_name}</span>
                  </div>
                )
              })}
            </div>
            {/* You can add more metrics here */}
          </div>
        )}
        {selected.length > 0 && !loading && (
          <div className="mt-6">
            <div className="font-semibold mb-2">Telemetry Data Comparison</div>
            <div className="h-80 border rounded">
              <AutoSizer>
                {({ height, width }) => (
                  <List
                    className="virtualized-list"
                    height={height}
                    itemCount={
                      Object.values(telemetry).reduce(
                        (max, data) => Math.max(max, data?.length || 0), 
                        0
                      )
                    }
                    itemSize={40}
                    width={width}
                  >
                    {({ index, style }) => (
                      <div 
                        className={`flex items-center px-2 ${
                          index % 2 === 0 ? 'bg-muted/30' : ''
                        }`}
                        style={style}
                      >
                        <div className="w-12 font-semibold text-sm">{index + 1}</div>
                        {selected.map(session => {
                          const data = telemetry[session.session_key] || [];
                          const item = data[index];
                          return (
                            <div 
                              key={session.session_key}
                              className="flex-1 flex flex-col px-2"
                            >
                              {item ? (
                                <>
                                  <div className="text-sm">{item.speed?.toFixed(1)} km/h</div>
                                  <div className="text-xs text-muted-foreground">
                                    T: {item.throttle?.toFixed(0)}% B: {item.brake?.toFixed(0)}%
                                  </div>
                                </>
                              ) : (
                                <span className="text-xs text-muted-foreground">No data</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </List>
                )}
              </AutoSizer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}