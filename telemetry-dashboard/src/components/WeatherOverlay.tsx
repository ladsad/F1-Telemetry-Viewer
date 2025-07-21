"use client"

import React, { useEffect, useCallback, useMemo } from "react";
import { CloudRain, Wind, Thermometer } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";
import { OpenF1Service } from "@/lib/api/openf1";
import { useTelemetry } from "@/context/TelemetryDataContext";
import WeatherAlert from "@/components/WeatherAlert";
import WeatherImpactIndicator from "@/components/WeatherImpactIndicator";
import WeatherTrendChart from "@/components/WeatherTrendChart";
import ConnectionStatusIndicator from "@/components/ConnectionStatusIndicator";
import { Loader2 } from "lucide-react";
import { WeatherOverlayProps, WeatherData } from "@/types";

// Create a memoized weather metric component
type WeatherMetricProps = {
  icon: React.ReactNode;
  value: number | string;
  unit: string;
  label: string;
};

const WeatherMetric = React.memo(({ icon, value, unit, label }: WeatherMetricProps) => (
  <motion.div 
    className="flex items-center gap-2"
    whileHover={{ scale: 1.05 }}
  >
    <div className="flex-shrink-0">
      {icon}
    </div>
    <div className="flex flex-col">
      <span className="font-semibold">{value}{unit}</span>
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  </motion.div>
));

// Define a fallback weather object to handle null or undefined values
const DEFAULT_WEATHER: WeatherData = {
  air_temperature: 0,
  track_temperature: 0,
  humidity: 0,
  pressure: 0,
  wind_speed: 0,
  wind_direction: "N/A",
  rainfall: 0
};

function WeatherOverlay({ 
  weatherData, 
  showForecast = false, 
  showImpact = true,
  refreshInterval = 10000 
}: WeatherOverlayProps = {}) {
  const { colors } = useTheme();
  const { telemetryState, updateWeather, connectionStatus } = useTelemetry();
  
  // Safely access weather data with default fallback
  const weather = telemetryState.weather || DEFAULT_WEATHER;
  const sessionKey = telemetryState.sessionKey;
  
  // Memoize fetch function
  const fetchWeather = useCallback(async () => {
    if (!sessionKey) return;
    
    try {
      const openf1 = new OpenF1Service("https://api.openf1.org/v1");
      const data = await openf1.getWeather(sessionKey);
      
      if (Array.isArray(data) && data.length > 0) {
        updateWeather(data[data.length - 1]);
      }
    } catch (err) {
      console.error("Error fetching weather:", err);
    }
  }, [sessionKey, updateWeather]);
  
  // Fetch weather data on mount and periodically
  useEffect(() => {
    if (!sessionKey) return;
    
    fetchWeather();
    const interval = setInterval(fetchWeather, refreshInterval);
    
    return () => {
      clearInterval(interval);
    };
  }, [fetchWeather, sessionKey, refreshInterval]);

  useEffect(() => {
    if (!weatherData && !telemetryState.weather) {
      // Fetch weather data if not provided and not already in context
      const openf1 = new OpenF1Service("https://api.openf1.org/v1");
      openf1.getWeather("latest")
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            updateWeather(data[data.length - 1]); // Use updateWeather instead of setWeather
          }
        })
        .catch(console.error);
    }
  }, [weatherData, telemetryState.weather, updateWeather]);

  // Calculate weather impact (memoized to avoid recalculation)
  const impact = useMemo(() => {
    // Safely handle optional values with nullish coalescing
    const rainfall = weather?.rainfall ?? 0;
    const trackTemp = weather?.track_temperature ?? 30;
    const windSpeed = weather?.wind_speed ?? 0;
    
    const rainImpact = rainfall > 0 ? rainfall * 0.8 : 0;
    const tempImpact = Math.abs(trackTemp - 35) * 0.05;
    const windImpact = windSpeed > 15 ? (windSpeed - 15) * 0.1 : 0;
    
    const totalImpact = rainImpact + tempImpact + windImpact;
    const avgLapImpact = totalImpact / 3; // Simple average for demo
    
    return {
      rain: { timeLoss: rainImpact },
      temp: { timeLoss: tempImpact },
      wind: { timeLoss: windImpact },
      total: totalImpact,
      avgLap: avgLapImpact
    };
  }, [weather]);

  // Loading state when no weather data
  if (!telemetryState.weather) {
    return (
      <Card 
        className="w-full h-full card-transition card-hover" 
        style={{ borderColor: colors.primary, background: colors.primary + "10" }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudRain className="w-5 h-5" />
            <span>Weather Conditions</span>
            <ConnectionStatusIndicator service="telemetry" size="sm" showLabel={false} />
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
            <ConnectionStatusIndicator service="telemetry" size="sm" showLabel={false} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WeatherAlert weather={weather} />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 timing-display">
            <WeatherMetric 
              icon={<CloudRain className="text-blue-500" />}
              value={weather.rainfall ?? 0}
              unit=" mm"
              label="Rainfall"
            />
            
            <WeatherMetric 
              icon={<Thermometer className="text-orange-500" />}
              value={weather.air_temperature ?? 0}
              unit="°C"
              label="Air"
            />
            
            <WeatherMetric 
              icon={<Thermometer className="text-yellow-500" />}
              value={weather.track_temperature ?? 0}
              unit="°C"
              label="Track"
            />
            
            <WeatherMetric 
              icon={<Wind className="text-cyan-500" />}
              value={weather.wind_speed ?? 0}
              unit=" km/h"
              label={weather.wind_direction ?? "N/A"}
            />
          </div>
          
          {showImpact && impact && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-4"
            >
              <WeatherImpactIndicator weather={weather} impact={impact} />
            </motion.div>
          )}
        </CardContent>
        
        {showForecast && (
          <motion.div 
            className="mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <WeatherTrendChart sessionKey={sessionKey} />
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
}

export default React.memo(WeatherOverlay);
