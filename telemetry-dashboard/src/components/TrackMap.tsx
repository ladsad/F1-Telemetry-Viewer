"use client"

import React, { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { MapIcon, ZoomIn, ZoomOut } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import LapCounter from "@/components/LapCounter";
import { OpenF1Service } from "@/lib/api/openf1";
import AnimatedButton from "@/components/AnimatedButton";
import { useTelemetry } from "@/context/TelemetryDataContext";
import ConnectionStatusIndicator from "@/components/ConnectionStatusIndicator";
import { Loader2 } from "lucide-react";
import { TrackMapProps, DriverPosition, OpenF1TrackLayout } from "@/types";

// Types for sector time display
type SectorTimeDisplay = {
  sector: number;
  time?: number;
  driver?: number;
  color: string;
};

function sectorColor(performance: string) {
  switch (performance) {
    case "personal_best": return "#9333ea"; // Purple
    case "session_best": return "#22c55e";  // Green
    case "slow": return "#ef4444";          // Red
    default: return "#f59e0b";              // Yellow (default)
  }
}

// Fetch track data with all required info
async function fetchTrackData(sessionKey: string) {
  const openf1 = new OpenF1Service("https://api.openf1.org/v1");

  try {
    const [positionsRes, sessionRes, lapRes] = await Promise.all([
      openf1.getDriverPositions(sessionKey),
      openf1.getSessionDetails(sessionKey),
      openf1.getLapInfo(sessionKey),
    ]);

    const layout = await openf1.getTrackLayout(sessionKey);

    const positions = (positionsRes || []).map((pos: any) => ({
      driver_number: pos.driver_number,
      name: pos.name || `#${pos.driver_number}`,
      x: pos.x ?? 0,
      y: pos.y ?? 0,
      color: pos.color || "#8884d8",
    }));

    // Get sector timings (approximated from intervals)
    const sectorTimings = await openf1.getSectorTimings(sessionKey);
    const lapInfo = lapRes || { currentLap: 1, totalLaps: 0, sectorTimes: [] };

    return { positions, layout, sectorTimings, lapInfo };
  } catch (error) {
    console.error('Error fetching track data:', error);
    return { 
      positions: [], 
      layout: { svgPath: "M0,0", width: 300, height: 200 }, 
      sectorTimings: [], 
      lapInfo: { currentLap: 1, totalLaps: 0, sectorTimes: [] }
    };
  }
}

// Memoize the marker component to prevent unnecessary renders
const DriverMarker = React.memo(function DriverMarker({ driver, cx, cy }: { driver: DriverPosition, cx: number, cy: number }) {
  return (
    <motion.g
      key={driver.driver_number}
      initial={{ x: cx - 30, y: cy, opacity: 0 }}
      animate={{
        x: cx,
        y: cy,
        opacity: 1,
        transition: {
          x: { type: "spring", stiffness: 100, damping: 20 },
          y: { type: "spring", stiffness: 100, damping: 20 },
        }
      }}
      exit={{ opacity: 0, scale: 0 }}
    >
      <motion.circle
        cx={0}
        cy={0}
        r={12}
        fill={driver.color}
        stroke="#fff"
        strokeWidth={2}
        whileHover={{ scale: 1.2 }}
        whileTap={{ scale: 1.3 }}
      />
      <motion.text
        x={0}
        y={4}
        textAnchor="middle"
        fontSize="10"
        fill="#fff"
        fontWeight="bold"
      >
        {driver.driver_number}
      </motion.text>
    </motion.g>
  );
});

export default React.memo(function TrackMap() {
  const { colors } = useTheme();
  const {
    telemetryState,
    updatePositions,
    updateRaceProgress,
    connectionStatus
  } = useTelemetry();

  // Track state
  const [layout, setLayout] = useState<{ svgPath: string; width: number; height: number }>({ svgPath: "M0,0", width: 300, height: 200 });
  const [sectorTimeDisplay, setSectorTimeDisplay] = useState<SectorTimeDisplay[]>([]);

  // Get session data from context
  const { positions = [], raceProgress = { currentLap: 1, totalLaps: 0, sectorTimes: [] }, sessionKey = "" } = telemetryState;

  // UI state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  // Refs
  const svgRef = useRef<SVGSVGElement>(null);
  const lastPanPoint = useRef({ x: 0, y: 0 });

  // Fetch track layout, sector times, and initial positions
  useEffect(() => {
    if (!sessionKey) return;

    let mounted = true;

    async function load() {
      try {
        const { positions: fetchedPositions, layout: fetchedLayout, sectorTimings, lapInfo } = await fetchTrackData(sessionKey);

        if (mounted) {
          // Set track layout
          setLayout(fetchedLayout);

          // Update positions in context
          updatePositions(fetchedPositions);

          // Process sector timing data
          setSectorTimeDisplay(
            [1, 2, 3].map((sectorNum) => {
              const best = sectorTimings
                .filter((s: any) => s.sector === sectorNum)
                .sort((a: any, b: any) => a.sector_time - b.sector_time)[0];

              return best
                ? {
                  sector: sectorNum,
                  time: best.sector_time,
                  driver: best.driver_number,
                  color: sectorColor(best.performance),
                }
                : {
                  sector: sectorNum,
                  color: "#666",
                };
            })
          );

          // Update race progress in context
          updateRaceProgress({
            currentLap: lapInfo.currentLap,
            totalLaps: lapInfo.totalLaps,
            sectorTimes: sectorTimeDisplay,
          });
        }
      } catch (err) {
        console.error("Error fetching track data:", err);
      }
    }

    load();

    // Poll for updated data every second if WebSocket isn't available
    const interval = connectionStatus.positions !== "open" ? setInterval(load, 1000) : undefined;

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey, connectionStatus.positions, updatePositions, updateRaceProgress]);

  // Memoize pan handlers to prevent recreations
  const handlePanStart = useCallback((clientX: number, clientY: number) => {
    setIsPanning(true);
    lastPanPoint.current = { x: clientX, y: clientY };
  }, []);

  const handlePanMove = useCallback((clientX: number, clientY: number) => {
    if (!isPanning) return;

    const dx = clientX - lastPanPoint.current.x;
    const dy = clientY - lastPanPoint.current.y;

    setPanOffset(prev => ({
      x: prev.x + dx / zoomLevel,
      y: prev.y + dy / zoomLevel
    }));

    lastPanPoint.current = { x: clientX, y: clientY };
  }, [isPanning, zoomLevel]);

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Mouse/touch event listeners for panning
  useEffect(() => {
    if (!isPanning) return;

    const handleMouseMove = (e: MouseEvent) => handlePanMove(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) handlePanMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const handleUp = () => handlePanEnd();

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchend", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchend", handleUp);
    };
  }, [isPanning, handlePanMove, handlePanEnd]);

  // Memoize zoom handlers
  const handleZoomIn = useCallback(() => setZoomLevel(prev => Math.min(prev * 1.2, 3)), []);
  const handleZoomOut = useCallback(() => setZoomLevel(prev => Math.max(prev / 1.2, 0.5)), []);

  // Memoize calculated driver positions for the map
  const driverPositions = useMemo(() => {
    return positions.map((driver: DriverPosition) => {
      const cx = 40 + driver.x * 220;
      const cy = 160 - driver.y * 120;
      return { driver, cx, cy };
    });
  }, [positions]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card
        className="w-full h-full card-transition card-hover"
        style={{ borderColor: colors.primary, background: colors.primary + "10" }}
      >
        <CardHeader className="p-responsive-md">
          <div className="flex flex-wrap items-center justify-between gap-responsive-sm">
            <CardTitle className="flex items-center gap-2 text-responsive-lg">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <MapIcon className="w-6 h-6" />
              </motion.div>
              <span>Track Map</span>
            </CardTitle>

            <div className="flex items-center gap-2">
              <ConnectionStatusIndicator service="positions" size="sm" />
              <AnimatedButton
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                aria-label="Zoom in"
                className="tap-target"
              >
                <ZoomIn className="w-5 h-5" />
              </AnimatedButton>
              <AnimatedButton
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                aria-label="Zoom out"
                className="tap-target"
              >
                <ZoomOut className="w-5 h-5" />
              </AnimatedButton>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-responsive-sm mt-2">
            <LapCounter
              currentLap={raceProgress.currentLap}
              totalLaps={raceProgress.totalLaps}
            />
            <div className="flex flex-wrap gap-2">
              {sectorTimeDisplay.map(
                (s, i) => (
                  <motion.span
                    key={i}
                    className="sector-badge font-formula1 tap-target py-1 px-2"
                    style={{ background: s.color, color: "#fff" }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    S{s.sector}: {s.time?.toFixed(3) || "--"}s
                  </motion.span>
                )
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-responsive-md">
          <div
            className="flex justify-center items-center overflow-hidden touch-manipulation"
            style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
            onMouseDown={(e) => handlePanStart(e.clientX, e.clientY)}
            onTouchStart={(e) => {
              if (e.touches[0]) handlePanStart(e.touches[0].clientX, e.touches[0].clientY)
            }}
          >
            <svg
              ref={svgRef}
              viewBox="0 0 300 200"
              className="w-full max-w-full h-auto"
              style={{
                maxHeight: "50vh",
                touchAction: 'none'
              }}
            >
              <g transform={`scale(${zoomLevel}) translate(${panOffset.x} ${panOffset.y})`}>
                {/* Track layout with animated drawing effect */}
                <motion.path
                  d={layout.svgPath}
                  fill="none"
                  stroke="#333"
                  strokeWidth="20"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.2"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                />

                {/* Driver markers with Framer Motion animation */}
                <AnimatePresence>
                  {driverPositions.map(({ driver, cx, cy }) => (
                    <DriverMarker key={driver.driver_number} driver={driver} cx={cx} cy={cy} />
                  ))}
                </AnimatePresence>
              </g>
            </svg>
          </div>

          {/* Loading state for track layout */}
          {!layout.svgPath || layout.svgPath === "M0,0" ? (
            <div className="flex items-center justify-center h-64 w-full">
              <motion.div
                className="flex flex-col items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Loader2 className="w-12 h-12 text-muted-foreground animate-spin mb-4" />
                <p className="text-muted-foreground">Loading track layout...</p>
              </motion.div>
            </div>
          ) : null}

          {/* Fallback message for no positions data */}
          {positions.length === 0 && connectionStatus.positions !== "connecting" && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 z-10">
              <div className="text-center p-4">
                <p className="font-semibold mb-1">No position data available</p>
                <p className="text-sm text-muted-foreground">
                  {connectionStatus.positions === "closed" || connectionStatus.positions === "error" ?
                    "Connection to position service unavailable" :
                    "Waiting for position data..."}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
});