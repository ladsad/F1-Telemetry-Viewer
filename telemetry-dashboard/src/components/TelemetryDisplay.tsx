"use client"

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge, Zap, Activity, Settings, TrendingUp, RefreshCw, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";
import { SpeedometerIcon, ERSIcon } from "@/components/Icons";
import AnimatedButton from "@/components/AnimatedButton";
import { useWebSocket } from "@/lib/hooks/useWebSocket";
import { useTelemetry } from "@/context/TelemetryDataContext";
import { TelemetryDisplayProps, TelemetryData } from "@/types";
import ConnectionStatusIndicator from "@/components/ConnectionStatusIndicator";

const TELEMETRY_CACHE_KEY = "telemetry_last_data";

// Cache utility functions
function saveTelemetryToCache(data: TelemetryData) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TELEMETRY_CACHE_KEY, JSON.stringify(data));
  }
}

function loadTelemetryFromCache(): TelemetryData | null {
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(TELEMETRY_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  }
  return null;
}

// Type definition for MetricDisplay props
interface MetricDisplayProps {
  icon: React.ReactNode;
  value: string | number;
  unit: string;
  label: string;
  prevValue?: string | number;
  isOffline?: boolean;
}

// Memoize the MetricDisplay component to prevent unnecessary renders
const MetricDisplay = React.memo(function MetricDisplay({ 
  icon, 
  value, 
  unit, 
  label, 
  prevValue, 
  isOffline = false 
}: MetricDisplayProps) {
  // Determine if the value has changed for animation
  const hasChanged = prevValue !== undefined && 
    Math.abs(parseFloat(String(prevValue)) - parseFloat(String(value))) > (label === "Speed" ? 2 : 5);
  
  return (
    <div className={`flex flex-col items-center justify-center tap-target p-responsive-sm ${
      isOffline ? 'opacity-60' : ''
    }`}>
      <div className="mb-1" style={{ minHeight: '24px' }}>{icon}</div>
      <motion.div 
        className="metric-value"
        animate={hasChanged && !isOffline ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        {value}
        <span className="ml-1 text-responsive-xs">{unit}</span>
      </motion.div>
      <div className="metric-label">{label}</div>
      {isOffline && (
        <span className="text-xs text-muted-foreground mt-1">Cached</span>
      )}
    </div>
  );
});

// Export with memo to prevent re-renders when parent components update
export default React.memo(function TelemetryDisplay(props: TelemetryDisplayProps) {
  const { colors } = useTheme();
  
  // Get data and connection status from context
  const { 
    telemetryState, 
    updateCarData,
    connectionStatus 
  } = useTelemetry();

  // Local state for animations and UI
  const [prevData, setPrevData] = useState<TelemetryData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Get car data from context
  const { carData } = telemetryState;
  
  // Load cached telemetry on mount - add dependency array
  useEffect(() => {
    const cached = loadTelemetryFromCache();
    if (cached) {
      updateCarData(cached);
    }
  }, [updateCarData]);
  
  // Save to cache when data updates
  useEffect(() => {
    if (carData) {
      setPrevData(prevData => {
        // Only update prevData if carData has changed significantly
        const shouldUpdate = !prevData || 
          Math.abs((prevData.speed || 0) - (carData.speed || 0)) > 2 ||
          Math.abs((prevData.throttle || 0) - (carData.throttle || 0)) > 5 ||
          Math.abs((prevData.brake || 0) - (carData.brake || 0)) > 5 ||
          prevData.gear !== carData.gear ||
          prevData.drs !== carData.drs;
          
        return shouldUpdate ? { ...carData } : prevData;
      });
      saveTelemetryToCache(carData);
    }
  }, [carData]);

  // Fallback: Poll REST API if no WebSocket or on error
  useEffect(() => {
    // Only poll if connection is not open
    if (connectionStatus.telemetry === "open") return;

    let mounted = true;
    let interval: NodeJS.Timeout | undefined = undefined;
    const intervalMs = 1000; // Default refresh interval

    const poll = async () => {
      // Since we don't have a fallback API URL from props, 
      // we'll rely on the context to handle data fetching
      // This useEffect can be simplified or removed
    };
    
    // Only set up polling if we have a way to fetch data
    // For now, we'll just return since no fallbackApiUrl is provided
    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [connectionStatus.telemetry, updateCarData]);

  // Memoize the connection indicator to prevent re-renders when other state changes
  const connectionIndicator = useMemo(() => {
    const status = connectionStatus.telemetry;
    
    if (status === "open") {
      return <span className="flex items-center gap-1 text-xs text-green-500">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        Live
      </span>;
    }
    
    if (status === "connecting") {
      return <span className="flex items-center gap-1 text-xs text-amber-500">
        <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
        Connecting...
      </span>;
    }
    
    if (status === "error" || status === "closed") {
      return <span className="flex items-center gap-1 text-xs text-red-500">
        <AlertCircle className="w-3 h-3" />
        {status === "error" ? "Connection Error" : "Disconnected"}
      </span>;
    }
    
    return null;
  }, [connectionStatus.telemetry]);

  // Memoize the display data to prevent unnecessary calculations
  const display = useMemo(() => {
    return carData || {
      speed: 0,
      throttle: 0,
      brake: 0,
      gear: 0,
      drs: false,
      rpm: 0,
    };
  }, [carData]);

  // Memoize the refresh handler
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    
    // Since no fallback API is defined in props, just simulate refresh
    setTimeout(() => setIsRefreshing(false), 500);
  }, []);

  // Whether to show the manual refresh button
  const showRefreshControl = connectionStatus.telemetry !== "open";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card 
        className="w-full card-transition card-hover fade-in" 
        style={{ borderColor: colors.primary, background: colors.primary + "10" }}
      >
        <CardHeader className="p-responsive-md">
          <div className="flex flex-wrap items-center justify-between gap-responsive-sm">
            <CardTitle className="flex items-center gap-2 text-responsive-lg">
              <motion.div 
                whileHover={{ rotate: 20 }} 
                whileTap={{ scale: 0.9, rotate: 40 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <SpeedometerIcon className="w-6 h-6" />
              </motion.div>
              <span>Live Telemetry</span>
              {connectionIndicator}
            </CardTitle>
            
            {showRefreshControl && (
              <AnimatedButton 
                variant="ghost" 
                size="sm" 
                className="tap-target"
                onClick={handleRefresh} 
                disabled={isRefreshing}
                aria-label="Refresh telemetry data"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="ml-1 text-responsive-sm">Refresh</span>
              </AnimatedButton>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-responsive-md">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-responsive-md">
            <MetricDisplay
              icon={<SpeedometerIcon color={colors.primary} className="w-7 h-7" />}
              value={Math.round(display.speed || 0)}
              unit="km/h"
              label="Speed"
              prevValue={prevData?.speed}
            />
            <MetricDisplay
              icon={<Zap className="mb-1 w-6 h-6" color={colors.primary} />}
              value={Math.round(display.throttle || 0)}
              unit="%"
              label="Throttle"
              prevValue={prevData?.throttle}
            />
            <MetricDisplay
              icon={<Activity className="mb-1 w-6 h-6" />}
              value={Math.round(display.brake || 0)}
              unit="%"
              label="Brake"
              prevValue={prevData?.brake}
            />
            <MetricDisplay
              icon={<Settings className="mb-1 w-6 h-6" />}
              value={display.gear || 0}
              unit=""
              label="Gear"
              prevValue={prevData?.gear}
            />
            <MetricDisplay
              icon={<TrendingUp className="mb-1 w-6 h-6" />}
              value={Math.round(display.rpm || 0)}
              unit="RPM"
              label="RPM"
              prevValue={prevData?.rpm}
            />
            <div className="flex flex-col items-center justify-center tap-target p-responsive-sm">
              <div 
                className={`mb-1 ${display.drs ? "text-green-500" : "text-gray-400"}`}
                style={{ minHeight: '24px' }}
              >
                <ERSIcon className="w-6 h-6" />
              </div>
              <motion.div 
                className="metric-value"
                animate={prevData?.drs !== display.drs ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {display.drs ? "ON" : "OFF"}
              </motion.div>
              <div className="metric-label">DRS</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});