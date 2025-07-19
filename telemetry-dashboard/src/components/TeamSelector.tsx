"use client"

import { useTheme } from "@/components/ThemeProvider"
import { TEAM_COLORS, TeamKey } from "@/lib/teamColors"

export default function TeamSelector() {
  const { team, setTeam } = useTheme()

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="team-select" className="text-sm font-medium">
        Team Theme:
      </label>
      <select
        id="team-select"
        className="rounded px-2 py-1 text-sm"
        value={team}
        onChange={e => setTeam(e.target.value as TeamKey)}
        style={{
          background: TEAM_COLORS[team].primary,
          color: TEAM_COLORS[team].accent,
        }}
      >
        {Object.entries(TEAM_COLORS).map(([key, val]) => (
          <option key={key} value={key}>
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </option>
        ))}
      </select>
    </div>
  )
}