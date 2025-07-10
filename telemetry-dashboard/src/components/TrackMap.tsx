"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Types for driver position data (from OpenF1)
type DriverPosition = {
  driver_number: number
  name: string
  x: number // normalized 0-1
  y: number // normalized 0-1
  color: string
}

// Utility to fetch driver positions from your API route
async function fetchDriverPositions(sessionKey: string): Promise<{ positions: DriverPosition[] }> {
  const res = await fetch(`/api/drivers?session_key=${sessionKey}`)
  if (!res.ok) throw new Error("Failed to fetch driver positions")
  const data = await res.json()
  // You may need to adapt this mapping based on your API response structure
  // Here we assume data.positions is an array of OpenF1 position objects
  return {
    positions: (data.positions || []).map((pos: any) => ({
      driver_number: pos.driver_number,
      name: pos.broadcast_name || pos.name || `#${pos.driver_number}`,
      x: pos.x || 0, // OpenF1: normalized_track_position_x
      y: pos.y || 0, // OpenF1: normalized_track_position_y
      color: pos.team_colour || "#8884d8",
    })),
  }
}

export default function TrackMap({ sessionKey = "latest" }: { sessionKey?: string }) {
  const [positions, setPositions] = useState<DriverPosition[]>([])
  const [track, setTrack] = useState<{ circuit?: string; country?: string; location?: string }>({})

  useEffect(() => {
    let mounted = true
    async function loadPositions() {
      try {
        const data = await fetchDriverPositions(sessionKey)
        if (mounted) setPositions(data.positions)
      } catch {
        // Optionally handle error
      }
    }
    loadPositions()
    const interval = setInterval(loadPositions, 2000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [sessionKey])

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle>Track Map</CardTitle>
        {track.circuit && (
          <div className="text-xs text-muted-foreground">{track.circuit} {track.country && `- ${track.country}`}</div>
        )}
      </CardHeader>
      <CardContent>
        <svg
          viewBox="0 0 300 200"
          width="100%"
          height="180"
          style={{ background: "#18181b", borderRadius: 12 }}
        >
          {/* Simple track outline */}
          <path
            d="M40,160 Q60,40 150,40 Q240,40 260,160 Q150,180 40,160 Z"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={4}
          />
          {/* Driver markers */}
          {positions.map((driver) => (
            <g key={driver.driver_number}>
              <circle
                cx={40 + (driver.x ?? 0) * 220}
                cy={160 - (driver.y ?? 0) * 120}
                r={10}
                fill={driver.color}
                stroke="#fff"
                strokeWidth={2}
              />
              <text
                x={40 + (driver.x ?? 0) * 220}
                y={160 - (driver.y ?? 0) * 120 + 4}
                textAnchor="middle"
                fontSize="10"
                fill="#fff"
                fontWeight="bold"
              >
                {driver.name}
              </text>
            </g>
          ))}
        </svg>
      </CardContent>
    </Card>
  )
}