"use client"

import React from "react"
import { motion } from "framer-motion"
import { useTelemetry } from "@/context/TelemetryDataContext"
import { Wifi, WifiOff, Loader2, AlertTriangle, Signal, Radio } from "lucide-react"
import { ConnectionStatusIndicatorProps } from "@/types"
import { useTheme } from "@/components/ThemeProvider"

export default function ConnectionStatusIndicator({
  service = 'all',
  showLabel = true,
  size = 'md',
  position = 'inline',
  showSignalStrength = false,
  pulseAnimation = true,
  compactMode = false
}: ConnectionStatusIndicatorProps) {
  const { connectionStatus } = useTelemetry()
  const { colors } = useTheme()
  
  // Determine the overall status if 'all' is selected
  let status: 'open' | 'closed' | 'connecting' | 'error' = 'closed'
  let connectedCount = 0
  let totalCount = 0
  
  if (service === 'all') {
    const allServices = Object.values(connectionStatus)
    totalCount = allServices.length
    connectedCount = allServices.filter(s => s === 'open').length
    
    if (allServices.every(s => s === 'open')) {
      status = 'open'
    } else if (allServices.some(s => s === 'error')) {
      status = 'error'
    } else if (allServices.some(s => s === 'connecting')) {
      status = 'connecting'
    } else {
      status = 'closed'
    }
  } else {
    // Type-safe access to connectionStatus
    if (service in connectionStatus) {
      status = connectionStatus[service as keyof typeof connectionStatus]
      totalCount = 1
      connectedCount = status === 'open' ? 1 : 0
    }
  }
    
  // Icon size based on the size prop
  const iconSize = size === 'sm' ? 12 : size === 'md' ? 16 : size === 'lg' ? 20 : 24
  const dotSize = size === 'sm' ? 6 : size === 'md' ? 8 : size === 'lg' ? 10 : 12
  
  // Enhanced status color and icon with proper F1 telemetry theming
  let statusColor = ''
  let StatusIcon = Wifi
  let signalStrength = 0
  
  switch (status) {
    case 'open':
      statusColor = '#22c55e' // green-500
      StatusIcon = connectedCount === totalCount ? Wifi : Signal
      signalStrength = Math.round((connectedCount / totalCount) * 4) // 0-4 bars
      break
    case 'closed':
      statusColor = '#6b7280' // gray-500 (less aggressive than red for disconnected)
      StatusIcon = WifiOff
      signalStrength = 0
      break
    case 'connecting':
      statusColor = '#f59e0b' // amber-500
      StatusIcon = Loader2
      signalStrength = 1
      break
    case 'error':
      statusColor = '#ef4444' // red-500
      StatusIcon = AlertTriangle
      signalStrength = 0
      break
  }
  
  // Enhanced status labels with service-specific context
  const getStatusLabel = () => {
    const baseLabel = status === 'open' ? 'Connected' 
      : status === 'connecting' ? 'Connecting...' 
      : status === 'error' ? 'Connection Error'
      : 'Disconnected'
    
    if (service === 'all' && totalCount > 1) {
      return `${baseLabel} (${connectedCount}/${totalCount})`
    }
    
    // Service-specific labels
    const serviceLabels = {
      telemetry: status === 'open' ? 'Live Telemetry' : `Telemetry ${baseLabel}`,
      positions: status === 'open' ? 'Live Positions' : `Positions ${baseLabel}`,
      timing: status === 'open' ? 'Live Timing' : `Timing ${baseLabel}`,
      weather: status === 'open' ? 'Live Weather' : `Weather ${baseLabel}`,
    }
    
    return serviceLabels[service as keyof typeof serviceLabels] || baseLabel
  }
  
  const statusLabel = getStatusLabel()
  
  // Floating position styles with F1 theme integration
  const floatingStyles = position === 'floating' 
    ? `fixed bottom-4 right-4 z-50 shadow-lg rounded-full px-3 py-2 bg-background/95 backdrop-blur-sm border border-border` 
    : ''
  
  // Text size classes
  const textSizeClass = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : size === 'lg' ? 'text-base' : 'text-lg'
  
  // Compact mode layout
  if (compactMode) {
    return (
      <motion.div 
        className={`flex items-center gap-1 ${floatingStyles}`}
        style={{ 
          color: statusColor,
          ...(position === 'floating' ? { borderColor: colors.primary + "40" } : {})
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        whileHover={{ scale: 1.05 }}
      >
        {/* Status dot only */}
        <motion.div
          className="rounded-full"
          style={{ 
            backgroundColor: statusColor,
            width: dotSize,
            height: dotSize
          }}
          animate={pulseAnimation && (status === 'connecting' || status === 'open') ? {
            scale: [1, 1.2, 1],
            opacity: [1, 0.7, 1]
          } : {}}
          transition={{ 
            duration: status === 'connecting' ? 1 : 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Connection count for 'all' service */}
        {service === 'all' && totalCount > 1 && showLabel && (
          <span className={`${textSizeClass} font-mono`}>
            {connectedCount}/{totalCount}
          </span>
        )}
      </motion.div>
    )
  }
  
  return (
    <motion.div 
      className={`flex items-center gap-2 ${floatingStyles}`}
      style={{ 
        color: statusColor,
        ...(position === 'floating' ? { borderColor: colors.primary + "40" } : {})
      }}
      initial={{ opacity: 0, y: position === 'floating' ? 20 : 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={position === 'floating' ? { scale: 1.05 } : {}}
    >
      {/* Main status indicator */}
      <div className="flex items-center gap-1.5">
        {/* Enhanced status icon with animations */}
        <motion.div
          animate={status === 'connecting' ? { rotate: 360 } : {}}
          transition={{ 
            duration: 2, 
            repeat: status === 'connecting' ? Infinity : 0,
            ease: "linear" 
          }}
        >
          <StatusIcon 
            className={`${status === 'connecting' ? 'animate-spin' : ''}`}
            size={iconSize} 
          />
        </motion.div>

        {/* Status dot with enhanced animations */}
        <motion.div
          className="rounded-full border border-white/20"
          style={{ 
            backgroundColor: statusColor,
            width: dotSize,
            height: dotSize
          }}
          animate={pulseAnimation ? {
            scale: status === 'open' ? [1, 1.1, 1] 
                 : status === 'connecting' ? [1, 1.3, 1]
                 : [1],
            opacity: status === 'error' ? [1, 0.5, 1] : [1]
          } : {}}
          transition={{ 
            duration: status === 'connecting' ? 1 : status === 'open' ? 2 : 1.5,
            repeat: (status === 'connecting' || status === 'open' || status === 'error') ? Infinity : 0,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Signal strength indicator */}
      {showSignalStrength && (
        <div className="flex items-end gap-0.5">
          {Array.from({ length: 4 }, (_, i) => (
            <motion.div
              key={i}
              className="rounded-sm"
              style={{ 
                width: 2,
                height: 3 + i * 1.5,
                backgroundColor: i < signalStrength ? statusColor : statusColor + '40'
              }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
            />
          ))}
        </div>
      )}

      {/* Status label with enhanced typography */}
      {showLabel && (
        <motion.span 
          className={`${textSizeClass} font-medium`}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.2 }}
        >
          {statusLabel}
        </motion.span>
      )}

      {/* Live indicator for active connections */}
      {status === 'open' && service !== 'all' && (
        <motion.span 
          className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-full font-medium"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          LIVE
        </motion.span>
      )}

      {/* Connection quality indicator */}
      {status === 'open' && service === 'all' && totalCount > 1 && (
        <motion.div 
          className="text-xs px-2 py-1 rounded-full border border-current/20"
          style={{ backgroundColor: statusColor + '20' }}
          whileHover={{ scale: 1.05 }}
        >
          <Radio className="w-3 h-3 inline mr-1" />
          {connectedCount === totalCount ? 'Full Signal' 
           : connectedCount > totalCount / 2 ? 'Good Signal'
           : connectedCount > 0 ? 'Weak Signal'
           : 'No Signal'}
        </motion.div>
      )}
    </motion.div>
  )
}

// Enhanced service-specific indicator components
export const TelemetryConnectionIndicator = (props: Omit<ConnectionStatusIndicatorProps, 'service'>) => (
  <ConnectionStatusIndicator service="telemetry" {...props} />
)

export const PositionsConnectionIndicator = (props: Omit<ConnectionStatusIndicatorProps, 'service'>) => (
  <ConnectionStatusIndicator service="positions" {...props} />
)

export const TimingConnectionIndicator = (props: Omit<ConnectionStatusIndicatorProps, 'service'>) => (
  <ConnectionStatusIndicator service="timing" {...props} />
)

export const WeatherConnectionIndicator = (props: Omit<ConnectionStatusIndicatorProps, 'service'>) => (
  <ConnectionStatusIndicator service="weather" {...props} />
)

// Floating global status indicator for dashboard
export const FloatingConnectionIndicator = () => (
  <ConnectionStatusIndicator 
    service="all"
    position="floating"
    size="md"
    showLabel={true}
    showSignalStrength={true}
    pulseAnimation={true}
  />
)