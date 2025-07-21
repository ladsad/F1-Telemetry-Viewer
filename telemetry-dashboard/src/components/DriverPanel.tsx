"use client"

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Circle, Battery, GaugeCircle, Activity, Wrench } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";
import { useTelemetry } from "@/context/TelemetryDataContext";
import ConnectionStatusIndicator from "@/components/ConnectionStatusIndicator";
import { Loader2 } from "lucide-react";
import { OpenF1Service } from "@/lib/api/openf1";
import { StatusIndicatorProps, DriverPanelProps } from "@/types";

// Create a memoized status component with proper typing
const StatusIndicator = React.memo(({ label, value, icon, color = "" }: StatusIndicatorProps) => (
  <div className="flex items-center gap-2 tap-target p-2">
    {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { 
      className: `w-6 h-6 ${color} flex-shrink-0` 
    })}
    <span className="font-semibold text-responsive-base">{value}</span>
    <span className="text-responsive-xs text-muted-foreground">{label}</span>
  </div>
));

// Define compound colors with proper typing
const compoundColors: Record<string, string> = {
  "SOFT": "bg-red-500",
  "MEDIUM": "bg-yellow-500",
  "HARD": "bg-white",
  "INTERMEDIATE": "bg-green-500",
  "WET": "bg-blue-500",
  "UNKNOWN": "bg-gray-300"
};

function DriverPanel({ driverNumber, sessionKey, showDetails = true }: DriverPanelProps = {}) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  
  // Access telemetry context
  const { 
    telemetryState, 
    updateDriverStatus,
    selectedDriverNumber,
    connectionStatus
  } = useTelemetry();
  
  // Get driver status from context
  const driverStatus = telemetryState.driverStatus?.[selectedDriverNumber];
  
  // Memoize fetch function to prevent recreation on renders
  const fetchStatus = useCallback(async () => {
    if (!sessionKey || !selectedDriverNumber) return;
    
    try {
      const openf1 = new OpenF1Service("https://api.openf1.org/v1");
      const data = await openf1.getDriverStatus(sessionKey, selectedDriverNumber);
      
      if (data) {
        updateDriverStatus(selectedDriverNumber, data);
      }
    } catch (err) {
      console.error("Error fetching driver status:", err);
    }
  }, [sessionKey, selectedDriverNumber, updateDriverStatus]);

  // Effect for fetching driver status
  useEffect(() => {
    let mounted = true;
    
    fetchStatus();
    
    const interval = setInterval(fetchStatus, 5000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [fetchStatus]);

  // Toggle panel expansion with useCallback
  const toggleExpand = useCallback(() => setExpanded(prev => !prev), []);

  // Memoize tire compound display to prevent unnecessary re-renders
  const tireCompoundDisplay = useMemo(() => {
    if (!driverStatus) return null;
    
    const compound = driverStatus.tire_compound || "UNKNOWN";
    const age = driverStatus.tire_age || 0;
    
    return (
      <div className="flex flex-row items-center flex-wrap gap-2 tap-target p-2">
        <Circle className={`w-6 h-6 ${compoundColors[compound] || "bg-gray-200"} 
          flex-shrink-0 ${connectionStatus.timing !== "open" ? "opacity-60" : ""}`} />
        <span className="font-semibold text-responsive-base">
          {compound} Tire
          {connectionStatus.timing !== "open" && 
            <span className="text-xs font-normal text-muted-foreground ml-2">(cached)</span>}
        </span>
        <span className="text-responsive-xs text-muted-foreground">({age} laps)</span>
      </div>
    );
  }, [driverStatus, connectionStatus.timing]);
  
  // Show loading state if no driver data
  if (!driverStatus) {
    return (
      <Card 
        className="w-full h-full"
        style={{ borderColor: colors.primary, background: colors.primary + "10" }}
      >
        <CardHeader>
          <CardTitle className="text-responsive-lg">Driver Panel</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-8">
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
          <div className="text-muted-foreground text-responsive-sm">Loading driver data...</div>
          <div className="text-xs text-muted-foreground mt-2">
            {connectionStatus?.timing === "closed" ? 
              "Connection unavailable - check network" : 
              "Connecting to timing service..."}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="w-full h-full card-transition card-hover"
      style={{ borderColor: colors.primary, background: colors.primary + "10" }}
    >
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-responsive-lg truncate max-w-[150px] sm:max-w-none">
            {driverStatus.driver_name || `Driver #${selectedDriverNumber}`}
          </CardTitle>
          <ConnectionStatusIndicator service="timing" size="sm" showLabel={false} />
          <div className="text-responsive-xs text-muted-foreground">#{driverStatus.driver_number || selectedDriverNumber}</div>
        </div>
      </CardHeader>
      <CardContent>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-2"
        >
          {/* Tire Compound */}
          {tireCompoundDisplay}
          
          {/* Energy Status */}
          <StatusIndicator
            label="ERS Deployment"
            value={`${(driverStatus.ers_deployment || 0).toFixed(1)}%`}
            icon={<Battery />}
            color="text-blue-500"
          />
          
          {/* Fuel Status */}
          <StatusIndicator
            label="Fuel Remaining"
            value={`${(driverStatus.fuel_remaining || 0).toFixed(1)}kg`}
            icon={<GaugeCircle />}
            color="text-yellow-500"
          />
          
          {/* Last Lap */}
          <StatusIndicator
            label="Last Lap"
            value={driverStatus.last_lap_time ? 
              new Date(driverStatus.last_lap_time * 1000).toISOString().substr(14, 8) : 
              "--:--:--"}
            icon={<Activity />}
            color="text-green-500"
          />
          
          {/* Pit Status */}
          <StatusIndicator
            label="Pit Status"
            value={driverStatus.in_pit ? "In Pit" : "On Track"}
            icon={<Wrench />}
            color={driverStatus.in_pit ? "text-red-500" : "text-green-500"}
          />
        </motion.div>
      </CardContent>
    </Card>
  );
}

export default React.memo(DriverPanel);
