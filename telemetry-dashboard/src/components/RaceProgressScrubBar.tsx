"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"
import { useTheme } from "@/components/ThemeProvider"
import { OpenF1Service } from "@/lib/api/openf1"
import { useTelemetry } from "@/context/TelemetryDataContext"
import ConnectionStatusIndicator from "@/components/ConnectionStatusIndicator"
import { Loader2 } from "lucide-react"
import { RaceProgressScrubBarProps, OpenF1Event } from "@/types"

const EVENT_COLORS = {
  "overtake": "bg-yellow-500 border-yellow-600",
  "pit": "bg-blue-500 border-blue-600",
  "crash": "bg-red-500 border-red-600",
  "flag": "bg-purple-500 border-purple-600",
}

export default function RaceProgressScrubBar({ 
  sessionKey,
  value,
  max,
  onChange = () => {},
  showEvents = true 
}: RaceProgressScrubBarProps) {
  const { colors } = useTheme()
  const { telemetryState, updateRaceProgress } = useTelemetry()
  const { raceProgress } = telemetryState
  const totalLaps = raceProgress.totalLaps || 100
  const [events, setEvents] = useState<OpenF1Event[]>([])
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  
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
        {/* Connection status and loading state */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <span className="font-formula1">Race Progress</span>
            <ConnectionStatusIndicator service="timing" size="sm" showLabel={false} />
          </div>
          
          {loading && (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs text-muted-foreground">Loading events...</span>
            </div>
          )}
        </div>
        
        <div className="mb-2 flex justify-between text-responsive-sm font-formula1 uppercase tracking-wider">
          <span>Lap 1</span>
          <span>Lap {totalLaps}</span>
        </div>
        
        <div className="relative h-12 mb-4">
          {/* Scrub bar track */}
          <div 
            ref={barRef}
            className={`relative w-full h-4 bg-muted rounded-full mb-4 cursor-pointer ${
              connectionStatus.timing !== "open" ? "opacity-70" : ""
            }`}
            onClick={handleBarClick}
            onTouchStart={handleBarTouch}
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
        
        {connectionStatus.timing === "closed" && !loading && (
          <div className="text-xs text-amber-500 text-center mt-2 font-formula1">
            Connection offline - race progress updates paused
          </div>
        )}
      </CardContent>
    </Card>
  )
}