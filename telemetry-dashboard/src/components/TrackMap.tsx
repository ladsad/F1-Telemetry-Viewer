"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import { MapIcon, ZoomIn, ZoomOut } from "lucide-react"
import { useTheme } from "@/components/ThemeProvider"
import LapCounter from "@/components/LapCounter"
import type { OpenF1DriverPosition, OpenF1TrackLayout, OpenF1SectorTiming, OpenF1LapInfo } from "@/lib/api/types"
import { OpenF1Service } from "@/lib/api/openf1"
import AnimatedButton from "@/components/AnimatedButton"

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

export default function TrackMap({ sessionKey = "latest" }) {
  const { colors } = useTheme()
  const [layout, setLayout] = useState({ svgPath: "M0,0" })
  const [positions, setPositions] = useState<DriverPositionDisplay[]>([])
  const [sectorTimeDisplay, setSectorTimeDisplay] = useState<SectorTimeDisplay[]>([])
  const [lapInfo, setLapInfo] = useState<OpenF1LapInfo>({ currentLap: 1, totalLaps: 50 })
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const lastPanPoint = useRef({ x: 0, y: 0 })
  
  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const { positions, layout, sectorTimings, lapInfo } = await fetchTrackData(sessionKey)
        if (mounted) {
          setPositions(positions)
          setLayout(layout)
          setSectorTimeDisplay(
            [1, 2, 3].map((sectorNum) => {
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
          )
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

  // Handle touch pan interactions
  const handlePanStart = (clientX: number, clientY: number) => {
    setIsPanning(true)
    lastPanPoint.current = { x: clientX, y: clientY }
  }
  
  const handlePanMove = (clientX: number, clientY: number) => {
    if (!isPanning) return
    
    const dx = clientX - lastPanPoint.current.x
    const dy = clientY - lastPanPoint.current.y
    
    setPanOffset(prev => ({
      x: prev.x + dx / zoomLevel,
      y: prev.y + dy / zoomLevel
    }))
    
    lastPanPoint.current = { x: clientX, y: clientY }
  }
  
  const handlePanEnd = () => {
    setIsPanning(false)
  }
  
  // Setup pan event listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handlePanMove(e.clientX, e.clientY)
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) handlePanMove(e.touches[0].clientX, e.touches[0].clientY)
    }
    
    if (isPanning) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('touchmove', handleTouchMove, { passive: false })
      window.addEventListener('mouseup', handlePanEnd)
      window.addEventListener('touchend', handlePanEnd)
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('mouseup', handlePanEnd)
      window.removeEventListener('touchend', handlePanEnd)
    }
  }, [isPanning])

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * 1.2, 3))
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / 1.2, 0.5))
  
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.2 }}>
      <Card 
        className="w-full h-full card-transition card-hover" 
        style={{ borderColor: colors.primary, background: colors.primary + "10" }}
      >
        <CardHeader className="p-responsive-md">
          <div className="flex flex-wrap items-center justify-between gap-responsive-sm">
            <CardTitle className="flex items-center gap-2 text-responsive-lg">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <MapIcon className="w-6 h-6" />
              </motion.div>
              <span>Track Map</span>
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <AnimatedButton 
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                aria-label="Zoom in"
                className="tap-target"
              >
                <ZoomIn className="w-5 h-5" />
              </AnimatedButton>
              <AnimatedButton
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                aria-label="Zoom out"
                className="tap-target"
              >
                <ZoomOut className="w-5 h-5" />
              </AnimatedButton>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-responsive-sm mt-2">
            <LapCounter currentLap={lapInfo.currentLap} totalLaps={lapInfo.totalLaps} />
            <div className="flex flex-wrap gap-2">
              {sectorTimeDisplay.map(
                (s, i) =>
                  s && (
                    <motion.span
                      key={i}
                      className="sector-badge font-formula1 tap-target py-1 px-2"
                      style={{ background: s.color, color: "#fff" }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      S{s.sector}: {s.time?.toFixed(3)}s
                    </motion.span>
                  )
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-responsive-md">
          <div 
            className="flex justify-center items-center overflow-hidden touch-manipulation"
            style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
            onMouseDown={(e) => handlePanStart(e.clientX, e.clientY)}
            onTouchStart={(e) => {
              if (e.touches[0]) handlePanStart(e.touches[0].clientX, e.touches[0].clientY)
            }}
          >
            <svg 
              ref={svgRef}
              viewBox="0 0 300 200" 
              className="w-full max-w-full h-auto"
              style={{ 
                maxHeight: "50vh",
                touchAction: 'none'
              }}
            >
              <g transform={`scale(${zoomLevel}) translate(${panOffset.x} ${panOffset.y})`}>
                {/* Track layout with animated drawing effect */}
                <motion.path
                  d={layout.svgPath}
                  fill="none"
                  stroke="#333"
                  strokeWidth="20"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.2"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                />
                
                {/* Driver markers with Framer Motion animation */}
                <AnimatePresence>
                  {positions.map((driver) => {
                    const cx = 40 + driver.x * 220
                    const cy = 160 - driver.y * 120
                    return (
                      <motion.g
                        key={driver.driver_number}
                        initial={{ x: cx - 30, y: cy, opacity: 0 }}
                        animate={{ x: cx, y: cy, opacity: 1 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 120, 
                          damping: 20,
                          mass: 1
                        }}
                      >
                        <motion.circle
                          cx={0}
                          cy={0}
                          r={12} // Larger for touch targets
                          fill={driver.color}
                          stroke="#fff"
                          strokeWidth={2}
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 1.3 }}
                        />
                        <motion.text
                          x={0}
                          y={4}
                          textAnchor="middle"
                          fontSize="10"
                          fill="#fff"
                          fontWeight="bold"
                        >
                          {driver.driver_number}
                        </motion.text>
                      </motion.g>
                    )
                  })}
                </AnimatePresence>
              </g>
            </svg>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}