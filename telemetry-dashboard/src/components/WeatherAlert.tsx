"use client"

import React from 'react';
import { AlertCircle, CloudRain, Sun, Wind } from 'lucide-react';
import { motion } from 'framer-motion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WeatherData } from '@/types';

// Change the prop name from weatherData to weather
export default function WeatherAlert({ weather }: { weather: WeatherData }) {
  // Extract relevant weather data
  const { rainfall = 0, air_temperature = 0, wind_speed = 0 } = weather || {};
  
  // Determine if we should show a weather alert
  const shouldShowAlert = rainfall > 2 || air_temperature > 35 || air_temperature < 10 || wind_speed > 30;
  
  if (!shouldShowAlert) {
    return null;
  }
  
  // Determine alert type and message
  let icon = <AlertCircle className="h-4 w-4" />;
  let message = "";
  let colorClass = "bg-yellow-500/10 text-yellow-700 dark:text-yellow-500";
  
  if (rainfall > 2) {
    icon = <CloudRain className="h-4 w-4" />;
    message = `Heavy rain (${rainfall}mm) affecting track conditions`;
    colorClass = "bg-blue-500/10 text-blue-700 dark:text-blue-400";
  } else if (air_temperature > 35) {
    icon = <Sun className="h-4 w-4" />;
    message = `High temperature (${air_temperature}°C) could affect tire degradation`;
    colorClass = "bg-orange-500/10 text-orange-700 dark:text-orange-400";
  } else if (air_temperature < 10) {
    icon = <Sun className="h-4 w-4" />;
    message = `Low temperature (${air_temperature}°C) could make tire warming difficult`;
    colorClass = "bg-blue-500/10 text-blue-700 dark:text-blue-400";
  } else if (wind_speed > 30) {
    icon = <Wind className="h-4 w-4" />;
    message = `Strong winds (${wind_speed}km/h) may affect aerodynamics`;
    colorClass = "bg-purple-500/10 text-purple-700 dark:text-purple-400";
  }
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-4"
    >
      <Alert className={`${colorClass} flex items-center`}>
        <div className="mr-2">{icon}</div>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </motion.div>
  );
}