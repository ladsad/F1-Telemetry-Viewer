"use client"

import { useEffect } from "react";
import { CloudRain, Wind, Thermometer } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";
import { OpenF1Service } from "@/lib/api/openf1";
import { useTelemetry } from "@/context/TelemetryDataContext";
import WeatherAlert from "@/components/WeatherAlert";
import WeatherImpactIndicator from "@/components/WeatherImpactIndicator";
import WeatherTrendChart from "@/components/WeatherTrendChart";
import ConnectionStatusIndicator from "@/components/ConnectionStatusIndicator"
import { Loader2 } from "lucide-react"

export function WeatherOverlay() {
  const { colors } = useTheme();
  const { telemetryState, updateWeather, sessionKey, connectionStatus } = useTelemetry();
  const { weather } = telemetryState;
  
  // Fetch weather data on mount and periodically
  useEffect(() => {
    if (!sessionKey) return;
    
    let mounted = true;
    
    async function fetchWeather() {
      try {
        const openf1 = new OpenF1Service("https://api.openf1.org/v1");
        const data = await openf1.getWeather(sessionKey);
        
        if (mounted && Array.isArray(data) && data.length > 0) {
          updateWeather(data[data.length - 1]);
        }
      } catch (err) {
        console.error("Error fetching weather:", err);
      }
    }
    
    fetchWeather();
    const interval = setInterval(fetchWeather, 10000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [sessionKey]);

  // Calculate weather impact (simplified example)
  const impact = weather ? {
    rain: { timeLoss: weather.rainfall > 0 ? weather.rainfall * 0.8 : 0 },
    temp: { timeLoss: Math.abs(weather.track_temperature - 35) * 0.05 },
    wind: { timeLoss: weather.wind_speed > 15 ? (weather.wind_speed - 15) * 0.1 : 0 },
    total: 0,
    avgLap: 0
  } : null;
  
  if (impact) {
    impact.total = impact.rain.timeLoss + impact.temp.timeLoss + impact.wind.timeLoss;
    impact.avgLap = impact.total / 3; // Simple average for demo
  }

  if (!weather) {
    return (
      <Card 
        className="w-full h-full card-transition card-hover" 
        style={{ borderColor: colors.primary, background: colors.primary + "10" }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudRain className="w-5 h-5" />
            <span>Weather Conditions</span>
            <ConnectionStatusIndicator size="sm" showLabel={false} />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-8">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <div className="font-formula1 text-center">Loading weather data...</div>
          <div className="text-xs text-muted-foreground mt-2">
            {connectionStatus.telemetry === "closed" ? 
              "Connection unavailable - check network" : 
              "Connecting to weather service..."}
          </div>
        </CardContent>
      </Card>
    );
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
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
              <CloudRain className="w-5 h-5" />
            </motion.div>
            <span>Weather Conditions</span>
            <ConnectionStatusIndicator size="sm" showLabel={false} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WeatherAlert weather={weather} />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 timing-display">
            <motion.div 
              className="flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
            >
              <CloudRain className="text-blue-500 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="font-semibold">{weather.rainfall ?? 0} mm</span>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Rainfall</span>
              </div>
            </motion.div>
            
            <motion.div 
              className="flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
            >
              <Thermometer className="text-orange-500 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="font-semibold">{weather.air_temperature}°C</span>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Air</span>
              </div>
            </motion.div>
            
            <motion.div 
              className="flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
            >
              <Thermometer className="text-yellow-500 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="font-semibold">{weather.track_temperature}°C</span>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Track</span>
              </div>
            </motion.div>
            
            <motion.div 
              className="flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
            >
              <Wind className="text-cyan-500 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="font-semibold">{weather.wind_speed} km/h</span>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">{weather.wind_direction}</span>
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
        </CardContent>
        
        <motion.div 
          className="mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <WeatherTrendChart />
        </motion.div>
      </Card>
    </motion.div>
  );
}