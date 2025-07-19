"use client"

import { CloudRain, Wind, Thermometer, BarChart } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"
import { useTheme } from "@/components/ThemeProvider"
import { useState } from "react"
import AnimatedButton from "@/components/AnimatedButton"
import type { OpenF1WeatherData } from "@/lib/api/types"
import WeatherTrendChart from "@/components/WeatherTrendChart"
import WeatherAlert from "@/components/WeatherAlert"
import WeatherImpactIndicator from "@/components/WeatherImpactIndicator"
import { useEffect } from "react"
import { estimateWeatherImpact } from "@/lib/api/openf1"

type WeatherOverlayProps = {
  weather: OpenF1WeatherData | null
}

export function WeatherOverlay({ weather }: WeatherOverlayProps) {
  const { colors } = useTheme()
  const [impact, setImpact] = useState<import("@/lib/api/types").WeatherImpactEstimate | null>(null)
  const [expanded, setExpanded] = useState(false)
  
  useEffect(() => {
    if (!weather?.session_key) return
    estimateWeatherImpact(weather.session_key).then(setImpact)
  }, [weather?.session_key])

  if (!weather) {
    return (
      <Card 
        className="w-full h-full card-transition card-hover" 
        style={{ borderColor: colors.primary, background: colors.primary + "10" }}
      >
        <CardHeader className="p-responsive-md">
          <CardTitle className="flex items-center gap-2 text-responsive-lg">
            <CloudRain className="w-6 h-6" />
            <span>Weather Conditions</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-responsive-md">
          <div className="text-responsive-sm text-muted-foreground font-formula1">Loading weather data...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card 
        className="w-full h-full card-transition card-hover" 
        style={{ borderColor: colors.primary, background: colors.primary + "10" }}
      >
        <CardHeader className="p-responsive-md">
          <div className="flex flex-wrap items-center justify-between gap-responsive-sm">
            <CardTitle className="flex items-center gap-2 text-responsive-lg">
              <motion.div 
                animate={{ 
                  rotate: [0, 10, 0, -10, 0],
                  scale: [1, 1.1, 1, 1.1, 1]
                }} 
                transition={{ 
                  repeat: Infinity, 
                  repeatDelay: 5,
                  duration: 2
                }}
              >
                <CloudRain className="w-6 h-6" />
              </motion.div>
              <span>Weather Conditions</span>
            </CardTitle>
            
            <AnimatedButton
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(prev => !prev)}
              className="tap-target"
              aria-label={expanded ? "Show less" : "Show more"}
            >
              <BarChart className="w-5 h-5 mr-1" />
              <span className="text-responsive-sm">{expanded ? "Less" : "More"}</span>
            </AnimatedButton>
          </div>
        </CardHeader>
        <CardContent className="p-responsive-md">
          <WeatherAlert sessionKey={weather?.session_key || "latest"} latestWeather={weather} />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-responsive-md timing-display">
            <motion.div 
              className="flex items-center gap-2 tap-target p-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 1.1 }}
            >
              <CloudRain className="text-blue-500 flex-shrink-0 w-6 h-6" />
              <div className="flex flex-col">
                <span className="font-semibold text-responsive-base">{weather.rainfall ?? 0} mm</span>
                <span className="text-responsive-xs uppercase tracking-wider text-muted-foreground">Rainfall</span>
              </div>
            </motion.div>
            
            <motion.div 
              className="flex items-center gap-2 tap-target p-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 1.1 }}
            >
              <Thermometer className="text-orange-500 flex-shrink-0 w-6 h-6" />
              <div className="flex flex-col">
                <span className="font-semibold text-responsive-base">{weather.air_temperature}°C</span>
                <span className="text-responsive-xs uppercase tracking-wider text-muted-foreground">Air</span>
              </div>
            </motion.div>
            
            <motion.div 
              className="flex items-center gap-2 tap-target p-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 1.1 }}
            >
              <Thermometer className="text-yellow-500 flex-shrink-0 w-6 h-6" />
              <div className="flex flex-col">
                <span className="font-semibold text-responsive-base">{weather.track_temperature}°C</span>
                <span className="text-responsive-xs uppercase tracking-wider text-muted-foreground">Track</span>
              </div>
            </motion.div>
            
            <motion.div 
              className="flex items-center gap-2 tap-target p-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 1.1 }}
            >
              <Wind className="text-cyan-500 flex-shrink-0 w-6 h-6" />
              <div className="flex flex-col">
                <span className="font-semibold text-responsive-base">{weather.wind_speed} km/h</span>
                <span className="text-responsive-xs uppercase tracking-wider text-muted-foreground">{weather.wind_direction}</span>
              </div>
            </motion.div>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-4"
          >
            <WeatherImpactIndicator weather={weather} impact={impact} />
          </motion.div>
          
          {expanded && (
            <motion.div 
              className="mt-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5 }}
            >
              <WeatherTrendChart sessionKey={weather?.session_key || "latest"} />
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}