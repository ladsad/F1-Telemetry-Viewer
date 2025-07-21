"use client"

import { motion } from "framer-motion"
import { useTelemetry } from "@/context/TelemetryDataContext"
import { Wifi, WifiOff, Loader2, AlertTriangle } from "lucide-react"
import { ConnectionStatusIndicatorProps } from "@/types"
import { useTheme } from "@/components/ThemeProvider"

export default function ConnectionStatusIndicator({
  service = 'all',
  showLabel = true,
  size = 'md',
  position = 'inline'
}: ConnectionStatusIndicatorProps) {
  const { connectionStatus } = useTelemetry()
  const { colors } = useTheme()
  
  // Determine the overall status if 'all' is selected
  let status: 'open' | 'closed' | 'connecting' | 'error' = 'closed';
  
  if (service === 'all') {
    const allServices = Object.values(connectionStatus);
    if (allServices.every(s => s === 'open')) {
      status = 'open';
    } else if (allServices.some(s => s === 'error')) {
      status = 'error';
    } else if (allServices.some(s => s === 'connecting')) {
      status = 'connecting';
    } else {
      status = 'closed';
    }
  } else {
    // Type-safe access to connectionStatus
    if (service in connectionStatus) {
      status = connectionStatus[service as keyof typeof connectionStatus];
    }
  }
    
  // Icon size based on the size prop
  const iconSize = size === 'sm' ? 14 : size === 'md' ? 18 : 24
  
  // Status color and icon - using proper color values instead of Tailwind classes
  let statusColor = ''
  let StatusIcon = Wifi
  
  switch (status) {
    case 'open':
      statusColor = '#22c55e' // green-500
      StatusIcon = Wifi
      break
    case 'closed':
      statusColor = '#ef4444' // red-500
      StatusIcon = WifiOff
      break
    case 'connecting':
      statusColor = '#f59e0b' // amber-500
      StatusIcon = Loader2
      break
    case 'error':
      statusColor = '#ef4444' // red-500
      StatusIcon = AlertTriangle
      break
  }
  
  const statusLabel = status === 'open' ? 'Connected' 
    : status === 'connecting' ? 'Connecting...' 
    : status === 'error' ? 'Connection Error'
    : 'Disconnected'
  
  // Floating position styles
  const floatingStyles = position === 'floating' 
    ? 'fixed bottom-4 right-4 z-50 shadow-lg rounded-full px-3 py-2 bg-background border' 
    : ''
  
  // Text size classes
  const textSizeClass = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base';
    
  return (
    <motion.div 
      className={`flex items-center gap-1 ${floatingStyles}`}
      style={{ 
        color: statusColor,
        ...(position === 'floating' ? { borderColor: colors.primary } : {})
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <StatusIcon 
        className={`${status === 'connecting' ? 'animate-spin' : ''}`}
        size={iconSize} 
      />
      {showLabel && (
        <span className={textSizeClass}>
          {statusLabel}
        </span>
      )}
    </motion.div>
  )
}