"use client"

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge, Zap, Activity, Settings, TrendingUp, RefreshCw, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";
import { SpeedometerIcon, ERSIcon } from "@/components/Icons";
import AnimatedButton from "@/components/AnimatedButton";
import { useWebSocket } from "@/lib/hooks/useWebSocket";

// Telemetry data type
type TelemetryData = {
  speed: number;
  throttle: number;
  brake: number;
  gear: number;
  drs: boolean;
  rpm: number;
};

type TelemetryDisplayProps = {
  sessionKey?: string;
  wsUrl?: string;
  fallbackApiUrl?: string;
  refreshIntervalMs?: number;
};

const TELEMETRY_CACHE_KEY = "telemetry_last_data";

// Cache utility functions
function saveTelemetryToCache(data: TelemetryData) {
  try {
    localStorage.setItem(TELEMETRY_CACHE_KEY, JSON.stringify(data));
  } catch {}
}

function loadTelemetryFromCache(): TelemetryData | null {
  try {
    const raw = localStorage.getItem(TELEMETRY_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function TelemetryDisplay(props: TelemetryDisplayProps) {
  const { colors } = useTheme();
  
  // State for telemetry data and UI
  const [cachedData, setCachedData] = useState<TelemetryData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("idle");
  const [prevData, setPrevData] = useState<TelemetryData | null>(null);
  
  // Use enhanced WebSocket hook with queue integration
  const wsEndpoint = props.wsUrl && props.sessionKey
    ? `${props.wsUrl}?session_key=${props.sessionKey}`
    : null;
    
  const { 
    data: liveData, 
    status: wsStatus,
    queueLength 
  } = useWebSocket<TelemetryData>(wsEndpoint, {
    onStatusChange: (status) => setConnectionStatus(status),
    queueOptions: {
      throttleMs: 150,           // Update UI at most every 150ms
      processStrategy: 'smooth', // Smooth values to prevent jumpy UI
    }
  });

  // Load cached telemetry on mount
  useEffect(() => {
    const cached = loadTelemetryFromCache();
    if (cached) setCachedData(cached);
  }, []);
  
  // Save to cache when live data updates
  useEffect(() => {
    if (liveData) {
      setPrevData(cachedData); // Store previous for animations
      setCachedData(liveData);
      saveTelemetryToCache(liveData);
    }
  }, [liveData]);

  // Fallback: Poll REST API if no WebSocket or on error
  useEffect(() => {
    if (!props.fallbackApiUrl || wsStatus === "open") return;

    let mounted = true;
    let interval: NodeJS.Timeout;
    const intervalMs = props.refreshIntervalMs || 1000;

    const poll = async () => {
      try {
        const res = await fetch(props.fallbackApiUrl);
        if (!res.ok) return;
        
        const latest = await res.json();
        const newData: TelemetryData = latest[0] || latest;
        
        if (mounted) {
          setPrevData(cachedData);
          setCachedData(newData);
          saveTelemetryToCache(newData);
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
  }, [props.fallbackApiUrl, wsStatus, props.refreshIntervalMs, cachedData]);

  // Determine what data to display, with fallbacks
  const display = cachedData || {
    speed: 0,
    throttle: 0,
    brake: 0,
    gear: 0,
    drs: false,
    rpm: 0,
  };

  // Touch-friendly refresh handler
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    
    // Implement manual refresh logic
    setTimeout(() => setIsRefreshing(false), 1000);
  }, []);

  // Whether to show the manual refresh button
  const showRefreshControl = !wsEndpoint && !!props.fallbackApiUrl;

  // Connection indicator
  const connectionIndicator = () => {
    if (wsStatus === "open") {
      return <span className="flex items-center gap-1 text-xs text-green-500">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        Live {queueLength > 0 ? `(${queueLength})` : ''}
      </span>;
    }
    
    if (wsStatus === "connecting") {
      return <span className="flex items-center gap-1 text-xs text-amber-500">
        <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
        Connecting...
      </span>;
    }
    
    if (wsStatus === "error" || wsStatus === "closed") {
      return <span className="flex items-center gap-1 text-xs text-red-500">
        <AlertCircle className="w-3 h-3" />
        {wsStatus === "error" ? "Connection Error" : "Disconnected"}
      </span>;
    }
    
    return null;
  };

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

function MetricDisplay({ icon, value, unit, label, prevValue }) {
  // Determine if the value has changed for animation
  const hasChanged = prevValue !== undefined && prevValue !== parseFloat(value);
  
  return (
    <div className="flex flex-col items-center justify-center tap-target p-responsive-sm">
      <div className="mb-1" style={{ minHeight: '24px' }}>{icon}</div>
      <motion.div 
        className="metric-value"
        animate={hasChanged ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        {value}
        <span className="ml-1 text-responsive-xs">{unit}</span>
      </motion.div>
      <div className="metric-label">{label}</div>
    </div>
  );
}