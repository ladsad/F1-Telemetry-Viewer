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

type TelemetryDisplayProps = {
  refreshIntervalMs?: number;
  fallbackApiUrl?: string;
};

const TELEMETRY_CACHE_KEY = "telemetry_last_data";

// Cache utility functions
function saveTelemetryToCache(data: any) {
  try {
    localStorage.setItem(TELEMETRY_CACHE_KEY, JSON.stringify(data));
  } catch {}
}

function loadTelemetryFromCache(): any {
  try {
    const raw = localStorage.getItem(TELEMETRY_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Memoize the MetricDisplay component to prevent unnecessary renders
const MetricDisplay = React.memo(function MetricDisplay({ icon, value, unit, label, prevValue, isOffline = false }) {
  // Determine if the value has changed for animation
  const hasChanged = prevValue !== undefined && 
    Math.abs(parseFloat(prevValue) - parseFloat(value)) > (label === "Speed" ? 2 : 5);
  
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

export default function TelemetryDisplay(props: TelemetryDisplayProps) {
  const { colors } = useTheme();
  
  // Get data and connection status from context
  const { 
    telemetryState, 
    updateCarData,
    connectionStatus 
  } = useTelemetry();

  // Local state for animations and UI
  const [prevData, setPrevData] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Get car data from context
  const { carData } = telemetryState;
  
  // Load cached telemetry on mount
  useEffect(() => {
    const cached = loadTelemetryFromCache();
    if (cached) {
      updateCarData(cached);
    }
  }, []);
  
  // Save to cache when data updates
  useEffect(() => {
    if (carData) {
      setPrevData(prevData => {
        // Only update prevData if carData has changed significantly
        const shouldUpdate = !prevData || 
          Math.abs(prevData.speed - carData.speed) > 2 ||
          Math.abs(prevData.throttle - carData.throttle) > 5 ||
          Math.abs(prevData.brake - carData.brake) > 5 ||
          prevData.gear !== carData.gear ||
          prevData.drs !== carData.drs;
          
        return shouldUpdate ? { ...carData } : prevData;
      });
      saveTelemetryToCache(carData);
    }
  }, [carData]);

  // Fallback: Poll REST API if no WebSocket or on error
  useEffect(() => {
    if (!props.fallbackApiUrl || connectionStatus.telemetry === "open") return;

    let mounted = true;
    let interval: NodeJS.Timeout;
    const intervalMs = props.refreshIntervalMs || 1000;

    const poll = async () => {
      try {
        const res = await fetch(props.fallbackApiUrl);
        if (!res.ok) return;
        
        const latest = await res.json();
        const newData = latest[0] || latest;
        
        if (mounted) {
          updateCarData(newData);
        }
      } catch {
        // Ignore fetch errors
      }
    };
    
    poll();
    interval = setInterval(poll, intervalMs);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [props.fallbackApiUrl, connectionStatus.telemetry, props.refreshIntervalMs]);

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
    
    // Manual refresh logic
    if (props.fallbackApiUrl) {
      fetch(props.fallbackApiUrl)
        .then(res => res.json())
        .then(data => {
          updateCarData(data[0] || data);
          setIsRefreshing(false);
        })
        .catch(() => {
          setIsRefreshing(false);
        });
    } else {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  }, [props.fallbackApiUrl, updateCarData]);

  // Whether to show the manual refresh button
  const showRefreshControl = connectionStatus.telemetry !== "open" && !!props.fallbackApiUrl;

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
              {connectionIndicator()}
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
              value={`${Math.round(display.speed)}`}
              unit="km/h"
              label="Speed"
              prevValue={prevData?.speed}
            />
            <MetricDisplay
              icon={<Zap className="mb-1 w-6 h-6" color={colors.primary} />}
              value={`${Math.round(display.throttle)}`}
              unit="%"
              label="Throttle"
              prevValue={prevData?.throttle}
            />
            <MetricDisplay
              icon={<Activity className="mb-1 w-6 h-6" />}
              value={`${Math.round(display.brake)}`}
              unit="%"
              label="Brake"
              prevValue={prevData?.brake}
            />
            <MetricDisplay
              icon={<Settings className="mb-1 w-6 h-6" />}
              value={`${display.gear}`}
              unit=""
              label="Gear"
              prevValue={prevData?.gear}
            />
            <MetricDisplay
              icon={<TrendingUp className="mb-1 w-6 h-6" />}
              value={`${Math.round(display.rpm)}`}
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
}

// Export with memo to prevent re-renders when parent components update
export default React.memo(TelemetryDisplay);