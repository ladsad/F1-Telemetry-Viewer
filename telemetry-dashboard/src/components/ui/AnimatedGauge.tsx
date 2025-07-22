"use client"

import React, { useMemo } from "react"
import { motion, useSpring, useTransform, MotionValue } from "framer-motion"
import { useTheme } from "@/components/ThemeProvider"

export interface AnimatedGaugeProps {
  value: number
  max: number
  min?: number
  unit?: string
  label?: string
  size?: "sm" | "md" | "lg"
  color?: string
  showValue?: boolean
  showLabels?: boolean
  thickness?: number
  animationDuration?: number
  className?: string
  criticalThreshold?: number
  warningThreshold?: number
  style?: "circular" | "semicircle"
  segments?: Array<{
    min: number
    max: number
    color: string
    label?: string
  }>
}

export default function AnimatedGauge({
  value,
  max,
  min = 0,
  unit = "",
  label = "",
  size = "md",
  color,
  showValue = true,
  showLabels = true,
  thickness = 8,
  animationDuration = 1,
  className = "",
  criticalThreshold,
  warningThreshold,
  style = "circular",
  segments
}: AnimatedGaugeProps) {
  const { colors } = useTheme()

  // Size configurations
  const sizeConfig = useMemo(() => {
    const configs = {
      sm: { radius: 40, strokeWidth: 6, fontSize: 12, labelSize: 10 },
      md: { radius: 60, strokeWidth: 8, fontSize: 16, labelSize: 12 },
      lg: { radius: 80, strokeWidth: 10, fontSize: 20, labelSize: 14 }
    }
    return configs[size]
  }, [size])

  const { radius, strokeWidth, fontSize, labelSize } = sizeConfig
  const diameter = radius * 2
  const circumference = 2 * Math.PI * radius

  // Calculate angles for semicircle style
  const issemicircle = style === "semicircle"
  const startAngle = issemicircle ? -90 : -90
  const endAngle = issemicircle ? 90 : 270
  const totalAngle = endAngle - startAngle
  const arcLength = issemicircle ? circumference / 2 : circumference

  // Animated value with spring physics
  const animatedValue = useSpring(0, {
    damping: 20,
    stiffness: 100,
    duration: animationDuration
  })

  React.useEffect(() => {
    animatedValue.set(value)
  }, [value, animatedValue])

  // Transform animated value to progress percentage
  const progress = useTransform(
    animatedValue,
    [min, max],
    [0, 1]
  )

  // Dynamic color based on thresholds
  const gaugeColor = useMemo(() => {
    if (color) return color
    
    if (criticalThreshold && value >= criticalThreshold) {
      return "#ef4444" // red-500
    }
    if (warningThreshold && value >= warningThreshold) {
      return "#f59e0b" // amber-500
    }
    return colors.primary
  }, [value, criticalThreshold, warningThreshold, color, colors.primary])

  // Generate segment colors if segments are provided
  const segmentColors = useMemo(() => {
    if (!segments) return []
    
    return segments.map(segment => {
      const segmentProgress = Math.max(0, Math.min(1, 
        (Math.min(value, segment.max) - segment.min) / (segment.max - segment.min)
      ))
      return {
        ...segment,
        progress: segmentProgress,
        isActive: value >= segment.min && value <= segment.max
      }
    })
  }, [segments, value])

  // Create SVG path for semicircle
  const createArcPath = (startAngle: number, endAngle: number, radius: number) => {
    const start = polarToCartesian(0, 0, radius, endAngle)
    const end = polarToCartesian(0, 0, radius, startAngle)
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"
    
    return [
      "M", start.x, start.y, 
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ")
  }

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    }
  }

  const viewBoxSize = diameter + strokeWidth * 2 + 20
  const center = viewBoxSize / 2

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <div className="relative">
        <svg
          width={viewBoxSize}
          height={issemicircle ? viewBoxSize / 2 + 30 : viewBoxSize}
          viewBox={`0 0 ${viewBoxSize} ${issemicircle ? viewBoxSize / 2 + 30 : viewBoxSize}`}
          className="transform -rotate-90"
        >
          <defs>
            {/* Gradient definitions */}
            <linearGradient id={`gauge-gradient-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={gaugeColor} stopOpacity={0.3} />
              <stop offset="100%" stopColor={gaugeColor} stopOpacity={1} />
            </linearGradient>
            
            {/* Glow effect */}
            <filter id={`gauge-glow-${label}`}>
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Background track */}
          {issemicircle ? (
            <path
              d={createArcPath(startAngle, endAngle, radius)}
              fill="none"
              stroke={colors.primary + "20"}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              transform={`translate(${center}, ${center})`}
            />
          ) : (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={colors.primary + "20"}
              strokeWidth={strokeWidth}
            />
          )}

          {/* Segment backgrounds (if segments provided) */}
          {segments && segments.map((segment, index) => {
            const segmentStart = ((segment.min - min) / (max - min)) * totalAngle + startAngle
            const segmentEnd = ((segment.max - min) / (max - min)) * totalAngle + startAngle
            
            if (issemicircle) {
              return (
                <path
                  key={`segment-bg-${index}`}
                  d={createArcPath(segmentStart, segmentEnd, radius)}
                  fill="none"
                  stroke={segment.color + "30"}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  transform={`translate(${center}, ${center})`}
                />
              )
            } else {
              const segmentCircumference = circumference * ((segment.max - segment.min) / (max - min))
              const segmentOffset = circumference * ((segment.min - min) / (max - min))
              
              return (
                <circle
                  key={`segment-bg-${index}`}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={segment.color + "30"}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${segmentCircumference} ${circumference}`}
                  strokeDashoffset={-segmentOffset}
                  transform="rotate(-90)"
                  transformOrigin={`${center} ${center}`}
                />
              )
            }
          })}

          {/* Animated progress arc/circle */}
          {issemicircle ? (
            <motion.path
              d={createArcPath(startAngle, endAngle, radius)}
              fill="none"
              stroke={`url(#gauge-gradient-${label})`}
              strokeWidth={thickness}
              strokeLinecap="round"
              transform={`translate(${center}, ${center})`}
              filter={`url(#gauge-glow-${label})`}
              strokeDasharray={arcLength}
              strokeDashoffset={useTransform(progress, [0, 1], [arcLength, 0])}
              initial={{ strokeDashoffset: arcLength }}
            />
          ) : (
            <motion.circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={`url(#gauge-gradient-${label})`}
              strokeWidth={thickness}
              strokeLinecap="round"
              filter={`url(#gauge-glow-${label})`}
              strokeDasharray={circumference}
              strokeDashoffset={useTransform(progress, [0, 1], [circumference, 0])}
              initial={{ strokeDashoffset: circumference }}
            />
          )}

          {/* Tick marks */}
          {showLabels && (
            <g>
              {Array.from({ length: 9 }, (_, i) => {
                const tickValue = min + (i / 8) * (max - min)
                const angle = (i / 8) * totalAngle + startAngle
                const isMainTick = i % 2 === 0
                const tickLength = isMainTick ? 12 : 6
                const tickRadius = radius + strokeWidth / 2 + 2
                
                const tickStart = polarToCartesian(center, center, tickRadius, angle)
                const tickEnd = polarToCartesian(center, center, tickRadius + tickLength, angle)
                
                return (
                  <line
                    key={`tick-${i}`}
                    x1={tickStart.x}
                    y1={tickStart.y}
                    x2={tickEnd.x}
                    y2={tickEnd.y}
                    stroke={colors.primary + "60"}
                    strokeWidth={isMainTick ? 2 : 1}
                    strokeLinecap="round"
                  />
                )
              })}
            </g>
          )}

          {/* Value indicator needle */}
          <motion.line
            x1={center}
            y1={center}
            x2={center}
            y2={center - radius + strokeWidth}
            stroke={gaugeColor}
            strokeWidth={2}
            strokeLinecap="round"
            initial={{ rotate: startAngle }}
            animate={{ 
              rotate: useTransform(progress, [0, 1], [startAngle, endAngle])
            }}
            transformOrigin={`${center}px ${center}px`}
            filter={`url(#gauge-glow-${label})`}
          />

          {/* Center dot */}
          <circle
            cx={center}
            cy={center}
            r={4}
            fill={gaugeColor}
            stroke="white"
            strokeWidth={2}
          />
        </svg>

        {/* Center value display */}
        {showValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              className="text-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <motion.div
                style={{ fontSize: fontSize }}
                className="font-bold font-mono tabular-nums"
                animate={{ color: gaugeColor }}
                transition={{ duration: 0.3 }}
              >
                {Math.round(value)}
              </motion.div>
              {unit && (
                <div
                  style={{ fontSize: labelSize }}
                  className="text-muted-foreground font-medium"
                >
                  {unit}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </div>

      {/* Label */}
      {label && showLabels && (
        <motion.div
          className="mt-2 text-center font-medium text-muted-foreground"
          style={{ fontSize: labelSize }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {label}
        </motion.div>
      )}

      {/* Min/Max labels for semicircle */}
      {issemicircle && showLabels && (
        <div className="flex justify-between w-full mt-1 px-2">
          <span style={{ fontSize: labelSize - 2 }} className="text-muted-foreground">
            {min}
          </span>
          <span style={{ fontSize: labelSize - 2 }} className="text-muted-foreground">
            {max}
          </span>
        </div>
      )}
    </div>
  )
}

// Export different gauge presets for common F1 metrics
export const SpeedGauge = (props: Omit<AnimatedGaugeProps, 'max' | 'unit' | 'criticalThreshold' | 'warningThreshold'>) => (
  <AnimatedGauge
    max={350}
    unit="km/h"
    criticalThreshold={320}
    warningThreshold={280}
    label="Speed"
    {...props}
  />
)

export const RPMGauge = (props: Omit<AnimatedGaugeProps, 'max' | 'unit' | 'criticalThreshold' | 'warningThreshold'>) => (
  <AnimatedGauge
    max={15000}
    unit="RPM"
    criticalThreshold={14000}
    warningThreshold={12000}
    label="Engine RPM"
    {...props}
  />
)

export const ThrottleGauge = (props: Omit<AnimatedGaugeProps, 'max' | 'unit' | 'style'>) => (
  <AnimatedGauge
    max={100}
    unit="%"
    label="Throttle"
    style="semicircle"
    {...props}
  />
)

export const BrakeGauge = (props: Omit<AnimatedGaugeProps, 'max' | 'unit' | 'style' | 'color'>) => (
  <AnimatedGauge
    max={100}
    unit="%"
    label="Brake"
    style="semicircle"
    color="#ef4444"
    {...props}
  />
)

export const TireTemperatureGauge = (props: Omit<AnimatedGaugeProps, 'max' | 'min' | 'unit' | 'criticalThreshold' | 'warningThreshold' | 'segments'>) => (
  <AnimatedGauge
    min={60}
    max={120}
    unit="°C"
    criticalThreshold={110}
    warningThreshold={100}
    segments={[
      { min: 60, max: 80, color: "#3b82f6", label: "Cold" },
      { min: 80, max: 100, color: "#22c55e", label: "Optimal" },
      { min: 100, max: 110, color: "#f59e0b", label: "Hot" },
      { min: 110, max: 120, color: "#ef4444", label: "Critical" }
    ]}
    label="Tire Temp"
    {...props}
  />
)