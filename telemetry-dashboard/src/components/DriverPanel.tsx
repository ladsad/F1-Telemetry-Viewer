"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ChevronDown, ChevronUp, Circle, Zap, Wrench } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "@/components/ThemeProvider"
import { HelmetIcon, TireIcon, ERSIcon, PitIcon } from "@/components/Icons"
import DriverPerformanceMetrics from "@/components/DriverPerformanceMetrics"
import TireStrategyChart from "@/components/TireStrategyChart"
import DriverRadio from "@/components/DriverRadio"

const compoundColors: Record<string, string> = {
  Soft: "bg-red-500",
  Medium: "bg-yellow-400",
  Hard: "bg-gray-300",
  Inter: "bg-green-500",
  Wet: "bg-blue-500",
}

type DriverPanelProps = {
  sessionKey: string
  driverNumber: number
}

export function DriverPanel({ sessionKey, driverNumber }: DriverPanelProps) {
  const { colors } = useTheme()
  const [expanded, setExpanded] = useState(false)
  const [status, setStatus] = useState<OpenF1DriverStatus | null>(null)
  
  useEffect(() => {
    const openf1 = new OpenF1Service("https://api.openf1.org/v1")
    let mounted = true
    async function fetchStatus() {
      try {
        const data = await openf1.getDriverStatus(sessionKey, driverNumber)
        if (mounted) setStatus(data)
      } catch {
        if (mounted) setStatus(null)
      }
    }
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [sessionKey, driverNumber])

  const toggleExpand = () => setExpanded(prev => !prev)

  if (!status) {
    return (
      <Card className="w-full h-full animate-pulse">
        <CardHeader>
          <CardTitle className="text-responsive-lg">Driver Panel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-responsive-sm">Loading driver data...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card 
      className="w-full h-full card-transition card-hover" 
      style={{ borderColor: colors.primary, background: colors.primary + "10" }}
    >
      <CardHeader 
        className="flex flex-row items-center justify-between cursor-pointer p-responsive-md tap-target"
        onClick={toggleExpand}
      >
        <motion.div 
          className="flex items-center gap-2"
          whileHover={{ x: 5 }}
          whileTap={{ x: 10 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <motion.div
            whileHover={{ rotate: 10 }}
            whileTap={{ rotate: 20 }}
            transition={{ duration: 0.2 }}
          >
            <HelmetIcon className="w-8 h-8" style={{ color: status.teamColor }} />
          </motion.div>
          <div>
            <CardTitle className="text-responsive-lg truncate max-w-[150px] sm:max-w-none">
              {status.driver_name}
            </CardTitle>
            <div className="text-responsive-xs text-muted-foreground">#{status.driver_number}</div>
          </div>
        </motion.div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="p-2 tap-target"
        >
          <ChevronDown className="w-6 h-6" />
        </motion.div>
      </CardHeader>
      
      <CardContent className="flex flex-col gap-responsive-md p-responsive-md">
        <div className="flex flex-row items-center flex-wrap gap-2 tap-target p-2">
          <Circle className={`w-6 h-6 ${compoundColors[status.tire_compound] || "bg-gray-200"} flex-shrink-0`} />
          <span className="font-semibold text-responsive-base">{status.tire_compound} Tire</span>
          <span className="text-responsive-xs text-muted-foreground">({status.tire_age} laps)</span>
        </div>
        
        <AnimatePresence>
          {expanded && (
            <motion.div
              className="flex flex-col gap-responsive-lg"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-responsive-sm">
                <div className="flex items-center gap-2 tap-target p-2">
                  <Zap className="w-6 h-6 text-purple-500 flex-shrink-0" />
                  <span className="font-semibold text-responsive-base">{status.ers}%</span>
                  <span className="text-responsive-xs text-muted-foreground">ERS</span>
                </div>
                <div className="flex items-center gap-2 tap-target p-2">
                  <Wrench className="w-6 h-6 text-orange-400 flex-shrink-0" />
                  <span className="font-semibold text-responsive-base">{status.pit_status}</span>
                  <span className="text-responsive-xs text-muted-foreground truncate">
                    {status.last_pit ? `Last: Lap ${status.last_pit}` : ""}
                  </span>
                </div>
              </div>

              {/* Animated components with staggered animations */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <DriverPerformanceMetrics sessionKey={sessionKey} driverNumber={driverNumber} />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <TireStrategyChart sessionKey={sessionKey} driverNumber={driverNumber} />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <DriverRadio sessionKey={sessionKey} driverNumber={driverNumber} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}

function MetricRow({ icon, label, value, detail }) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div>
        <div className="text-sm font-semibold">{label}</div>
        <div className="flex items-center gap-2">
          <span className="metric-value">{value}</span>
          {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
        </div>
      </div>
    </div>
  )
}