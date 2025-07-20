"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"
import { useTheme } from "@/components/ThemeProvider"
import type { OpenF1Event, OpenF1LapInfo } from "@/lib/api/types"
import { OpenF1Service } from "@/lib/api/openf1"
import { useTelemetry } from "@/context/TelemetryDataContext"

const EVENT_COLORS = {
  "overtake": "bg-yellow-500 border-yellow-600",
  "pit": "bg-blue-500 border-blue-600",
  "crash": "bg-red-500 border-red-600",
  "flag": "bg-purple-500 border-purple-600",
}

type RaceProgressScrubBarProps = {
  onChange: (lap: number) => void
}

export default function RaceProgressScrubBar({ onChange }: RaceProgressScrubBarProps) {
  const { colors } = useTheme()
  const { telemetryState, sessionKey, updateRaceProgress } = useTelemetry()
  const { raceProgress } = telemetryState
  const value = raceProgress.currentLap
  
  const [events, setEvents] = useState<OpenF1Event[]>([])
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const totalLaps = raceProgress.totalLaps || 100
  
  // Handle touch and mouse events for scrubbing
  const handleInteractionStart = (clientX: number) => {
    if (!barRef.current) return
    setDragging(true)
    
    const rect = barRef.current.getBoundingClientRect()
    const percent = (clientX - rect.left) / rect.width
    const newLap = Math.max(1, Math.min(Math.round(percent * totalLaps), totalLaps))
    onChange(newLap)
    updateRaceProgress({ currentLap: newLap })
  }
  
  const handleInteractionMove = (clientX: number) => {
    if (!dragging || !barRef.current) return
    
    const rect = barRef.current.getBoundingClientRect()
    const percent = (clientX - rect.left) / rect.width
    const newLap = Math.max(1, Math.min(Math.round(percent * totalLaps), totalLaps))
    onChange(newLap)
    updateRaceProgress({ currentLap: newLap })
  }
  
  const handleInteractionEnd = () => {
    setDragging(false)
  }
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handleInteractionMove(e.clientX)
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) handleInteractionMove(e.touches[0].clientX)
    }
    
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('touchmove', handleTouchMove, { passive: false })
      window.addEventListener('mouseup', handleInteractionEnd)
      window.addEventListener('touchend', handleInteractionEnd)
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('mouseup', handleInteractionEnd)
      window.removeEventListener('touchend', handleInteractionEnd)
    }
  }, [dragging])
  
  // Get lap info and events from API
  useEffect(() => {
    if (!sessionKey) return
    
    setLoading(true)
    const openf1 = new OpenF1Service("https://api.openf1.org/v1")
    
    Promise.all([
      openf1.getLapInfo(sessionKey),
      openf1.getEvents(sessionKey)
    ]).then(([lapInfoData, eventsData]) => {
      if (Array.isArray(lapInfoData) && lapInfoData.length) {
        const lapInfo = lapInfoData[0]
        updateRaceProgress({
          currentLap: lapInfo.currentLap || 1,
          totalLaps: lapInfo.totalLaps || 1,
          sectorTimes: lapInfo.sectorTimes || []
        })
      }
      if (Array.isArray(eventsData)) {
        setEvents(eventsData)
      }
    }).catch(console.error)
    .finally(() => setLoading(false))
  }, [sessionKey, updateRaceProgress])
  
  if (!raceProgress.totalLaps) {
    return (
      <Card className="animate-pulse">
        <CardContent>
          <div className="h-12 bg-muted rounded-md"></div>
        </CardContent>
      </Card>
    )
  }
  
  const percent = ((value - 1) / (totalLaps - 1)) * 100
  
  // Map events to lap numbers for marker placement
  const lapMarkers = events.map((e, i) => {
    const lap = e.lap_number
    const markerPercent = ((lap - 1) / (totalLaps - 1)) * 100
    
    return (
      <motion.div
        key={i}
        className={`absolute top-0 h-8 w-4 rounded ${EVENT_COLORS[e.type] || "bg-gray-400 border-gray-600"} border-2 z-10 tap-target`}
        style={{ left: `calc(${markerPercent}% - 4px)` }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: i * 0.05, type: "spring" }}
        whileTap={{ scale: 1.5, zIndex: 20 }}
        title={`${e.type.toUpperCase()} - Lap ${lap}${e.description ? ": " + e.description : ""}`}
        aria-label={`${e.type} event on lap ${lap}`}
      />
    )
  })
  
  return (
    <Card 
      className="w-full card-transition fade-in my-4"
      style={{ borderColor: colors.primary, background: colors.primary + "10" }}
    >
      <CardContent className="p-responsive-md">
        <div className="mb-2 flex justify-between text-responsive-sm font-formula1 uppercase tracking-wider">
          <span>Lap 1</span>
          <span>Lap {totalLaps}</span>
        </div>
        
        <div className="relative h-12 mb-4">
          {/* Scrub bar track */}
          <div 
            ref={barRef}
            className="absolute left-0 top-3 w-full h-6 bg-accent/20 rounded-full cursor-pointer"
            onMouseDown={(e) => handleInteractionStart(e.clientX)}
            onTouchStart={(e) => {
              e.preventDefault(); // Prevent scrolling while scrubbing
              if (e.touches[0]) handleInteractionStart(e.touches[0].clientX)
            }}
            style={{ touchAction: 'none' }}
          >
            {/* Active part of the track */}
            <div 
              className="absolute left-0 top-0 h-full bg-primary/40 rounded-full"
              style={{ width: `${percent}%` }}
            ></div>
            
            {/* Thumb */}
            <div
              ref={thumbRef}
              className="absolute top-50% w-8 h-8 bg-primary rounded-full shadow-md transform -translate-y-1/4 -translate-x-1/2 border-2 border-white cursor-grab active:cursor-grabbing"
              style={{ 
                left: `${percent}%`, 
                touchAction: 'none',
                marginTop: '-2px' 
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                setDragging(true);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setDragging(true);
              }}
            ></div>
          </div>
          
          {/* Event markers */}
          <div className="absolute left-0 top-1 w-full h-8 pointer-events-none">
            {lapMarkers}
          </div>
        </div>
        
        {/* Dynamic lap indicator */}
        <motion.div 
          className="text-responsive-lg font-bold font-formula1 text-center mt-2"
          key={value}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          Lap {value}
        </motion.div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 text-responsive-xs font-formula1 justify-center">
          {Object.entries(EVENT_COLORS).map(([type, color]) => (
            <motion.span 
              key={type} 
              className="flex items-center gap-1 uppercase tracking-wider tap-target p-1"
              whileTap={{ scale: 1.1 }}
            >
              <span className={`inline-block w-3 h-3 rounded ${color}`} />
              {type}
            </motion.span>
          ))}
        </div>
        
        {loading && (
          <div className="text-responsive-xs text-muted-foreground mt-2 font-formula1 text-center">
            Loading events...
          </div>
        )}
      </CardContent>
    </Card>
  )
}