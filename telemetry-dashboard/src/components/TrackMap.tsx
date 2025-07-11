"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { OpenF1DriverPosition, OpenF1TrackLayout, OpenF1SectorTiming, OpenF1LapInfo } from "@/lib/api/types"
import { OpenF1Service } from "@/lib/api/openf1"
import { motion, AnimatePresence } from "framer-motion"
import LapCounter from "@/components/LapCounter"

async function fetchTrackData(sessionKey: string) {
  const openf1 = new OpenF1Service("https://api.openf1.org/v1")
  const [positionsRes, sessionRes, sectorRes, lapRes] = await Promise.all([
    openf1.getDriverPositions(sessionKey),
    openf1.getSessionDetails(sessionKey),
    openf1.getSectorTimings(sessionKey),
    openf1.getLapInfo(sessionKey),
  ])
  const layout: OpenF1TrackLayout = sessionRes?.track_layout || {
    svgPath: "M40,160 Q60,40 150,40 Q240,40 260,160 Q150,180 40,160 Z",
    width: 300,
    height: 200,
  }
  const positions: OpenF1DriverPosition[] = (positionsRes || []).map((pos: any) => ({
    driver_number: pos.driver_number,
    name: pos.driver_name || pos.broadcast_name || `#${pos.driver_number}`,
    x: pos.normalized_track_position_x ?? 0,
    y: pos.normalized_track_position_y ?? 0,
    color: pos.color || pos.team_colour || "#8884d8",
  }))
  const sectorTimings: OpenF1SectorTiming[] = sectorRes || []
  const lapInfo: OpenF1LapInfo = lapRes || { currentLap: 1, totalLaps: 0, sectorTimes: [] }
  return { positions, layout, sectorTimings, lapInfo }
}

function sectorColor(performance: string) {
  if (performance === "fastest") return "#22c55e"
  if (performance === "personal_best") return "#fbbf24"
  return "#ef4444"
}

export default function TrackMap({ sessionKey = "latest" }: { sessionKey?: string }) {
  const [positions, setPositions] = useState<OpenF1DriverPosition[]>([])
  const [layout, setLayout] = useState<OpenF1TrackLayout>({
    svgPath: "M40,160 Q60,40 150,40 Q240,40 260,160 Q150,180 40,160 Z",
    width: 300,
    height: 200,
  })
  const [sectorTimings, setSectorTimings] = useState<OpenF1SectorTiming[]>([])
  const [lapInfo, setLapInfo] = useState<OpenF1LapInfo>({ currentLap: 1, totalLaps: 0, sectorTimes: [] })

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const { positions, layout, sectorTimings, lapInfo } = await fetchTrackData(sessionKey)
        if (mounted) {
          setPositions(positions)
          setLayout(layout)
          setSectorTimings(sectorTimings)
          setLapInfo(lapInfo)
        }
      } catch {
        // Optionally handle error
      }
    }
    load()
    const interval = setInterval(load, 1000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [sessionKey])

  // Example sector boundaries (for demo, you may want to fetch these from API)
  const sectorBoundaries = [
    { x: 80, y: 60, label: "S1" },
    { x: 200, y: 60, label: "S2" },
    { x: 260, y: 160, label: "S3" },
  ]

  // Group sector times by sector
  const sectorTimeDisplay = [1, 2, 3].map((sectorNum) => {
    const best = sectorTimings
      .filter((s) => s.sector === sectorNum)
      .sort((a, b) => a.sector_time - b.sector_time)[0]
    return best
      ? {
          sector: sectorNum,
          time: best.sector_time,
          driver: best.driver_number,
          color: sectorColor(best.performance),
        }
      : null
  })

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle>Track Map</CardTitle>
        <div className="flex items-center gap-4 mt-2">
          <LapCounter currentLap={lapInfo.currentLap} totalLaps={lapInfo.totalLaps} />
          <div className="flex gap-2">
            {sectorTimeDisplay.map(
              (s, i) =>
                s && (
                  <span
                    key={i}
                    className="px-2 py-1 rounded text-xs font-mono"
                    style={{ background: s.color, color: "#fff" }}
                  >
                    S{s.sector}: {s.time?.toFixed(3)}s
                  </span>
                )
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          width="100%"
          height={layout.height}
          style={{ background: "#18181b", borderRadius: 12 }}
        >
          {/* Track outline */}
          <path
            d={layout.svgPath}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={4}
          />
          {/* Sector boundaries (visual markers) */}
          {sectorBoundaries.map((s, i) => (
            <g key={i}>
              <circle cx={s.x} cy={s.y} r={6} fill="#fff" opacity={0.5} />
              <text x={s.x} y={s.y - 10} textAnchor="middle" fontSize="10" fill="#fff">
                {s.label}
              </text>
            </g>
          ))}
          {/* Sector timing overlays (color-coded lines) */}
          {sectorTimings.map((sector, i) => {
            if (
              typeof sector.start_x === "number" &&
              typeof sector.start_y === "number" &&
              typeof sector.end_x === "number" &&
              typeof sector.end_y === "number"
            ) {
              const x1 = 40 + sector.start_x * 220
              const y1 = 160 - sector.start_y * 120
              const x2 = 40 + sector.end_x * 220
              const y2 = 160 - sector.end_y * 120
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={sectorColor(sector.performance)}
                  strokeWidth={5}
                  opacity={0.7}
                />
              )
            }
            return null
          })}
          {/* Driver markers with Framer Motion animation */}
          <AnimatePresence>
            {positions.map((driver) => {
              const cx = 40 + driver.x * 220
              const cy = 160 - driver.y * 120
              return (
                <motion.g
                  key={driver.driver_number}
                  initial={false}
                  animate={{ x: cx, y: cy }}
                  transition={{ type: "spring", stiffness: 120, damping: 20 }}
                >
                  <motion.circle
                    cx={0}
                    cy={0}
                    r={10}
                    fill={driver.color}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                  <motion.text
                    x={0}
                    y={4}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#fff"
                    fontWeight="bold"
                  >
                    {driver.name}
                  </motion.text>
                </motion.g>
              )
            })}
          </AnimatePresence>
        </svg>
      </CardContent>
    </Card>
  )
}