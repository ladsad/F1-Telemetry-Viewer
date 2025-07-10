"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { OpenF1Service } from "@/lib/api/openf1"

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

type Props = {
  onSelect: (session: Session) => void
}

const sessionTypes = [
  "Race",
  "Qualifying",
  "Sprint",
  "Practice 1",
  "Practice 2",
  "Practice 3",
]

export default function HistoricSessionSelector({ onSelect }: Props) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [season, setSeason] = useState<number | "">("")
  const [type, setType] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSessions() {
      setLoading(true)
      setError(null)
      try {
        const openf1 = new OpenF1Service("https://api.openf1.org/v1")
        const allSessions = await openf1.getSessions(season ? Number(season) : undefined)
        setSessions(allSessions)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }
    fetchSessions()
  }, [season])

  const filtered = sessions.filter(
    (s) =>
      (!type || s.session_type === type) &&
      (!season || s.season === Number(season))
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historic Session Selector</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            type="number"
            placeholder="Season (e.g. 2023)"
            className="border rounded px-2 py-1 text-sm"
            value={season}
            min={2018}
            max={new Date().getFullYear()}
            onChange={e => setSeason(e.target.value ? Number(e.target.value) : "")}
          />
          <select
            className="border rounded px-2 py-1 text-sm"
            value={type}
            onChange={e => setType(e.target.value)}
          >
            <option value="">All Types</option>
            {sessionTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        {loading && <div className="text-muted-foreground text-sm">Loading sessions...</div>}
        {error && <div className="text-destructive text-sm">{error}</div>}
        <div className="max-h-64 overflow-y-auto divide-y">
          {filtered.map((session) => (
            <button
              key={session.session_key}
              className="w-full text-left py-2 px-1 hover:bg-accent rounded transition"
              onClick={() => onSelect(session)}
            >
              <div className="font-medium">{session.session_name} ({session.session_type})</div>
              <div className="text-xs text-muted-foreground">
                {session.circuit_short_name || "Unknown Circuit"} | {session.country_name || "Unknown Country"} | {session.date_start?.slice(0, 10)}
              </div>
            </button>
          ))}
          {!loading && filtered.length === 0 && (
            <div className="text-muted-foreground text-sm py-4 text-center">No sessions found.</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}