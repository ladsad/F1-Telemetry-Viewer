"use client"

import { motion } from "framer-motion"
import { useTelemetry } from "@/context/TelemetryDataContext"
import { Wifi, WifiOff, Loader2, AlertTriangle } from "lucide-react"
import { useTheme } from "@/components/ThemeProvider"

type ConnectionStatusIndicatorProps = {
  service?: 'telemetry' | 'positions' | 'timing' | 'all'
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  position?: 'inline' | 'floating'
}

export default function ConnectionStatusIndicator({
  service = 'all',
  showLabel = true,
  size = 'md',
  position = 'inline'
}: ConnectionStatusIndicatorProps) {
  const { connectionStatus } = useTelemetry()
  const { colors } = useTheme()
  
  // Determine the overall status if 'all' is selected
  let status = service === 'all' 
    ? (connectionStatus.telemetry === 'open' && connectionStatus.positions === 'open' 
       ? 'open' 
       : connectionStatus.telemetry === 'error' || connectionStatus.positions === 'error' 
       ? 'error'
       : connectionStatus.telemetry === 'connecting' || connectionStatus.positions === 'connecting'
       ? 'connecting'
       : 'closed')
    : connectionStatus[service]
    
  // Icon size based on the size prop
  const iconSize = size === 'sm' ? 14 : size === 'md' ? 18 : 24
  
  // Status color and icon
  let statusColor = ''
  let StatusIcon = Wifi
  
  switch (status) {
    case 'open':
      statusColor = 'text-green-500'
      StatusIcon = Wifi
      break
    case 'closed':
      statusColor = 'text-red-500'
      StatusIcon = WifiOff
      break
    case 'connecting':
      statusColor = 'text-amber-500'
      StatusIcon = Loader2
      break
    case 'error':
      statusColor = 'text-red-500'
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
    
  return (
    <motion.div 
      className={`flex items-center gap-1 ${statusColor} ${floatingStyles}`}
      style={position === 'floating' ? { borderColor: colors.primary } : {}}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <StatusIcon 
        className={`${status === 'connecting' ? 'animate-spin' : ''}`}
        size={iconSize} 
      />
      {showLabel && (
        <span className={`text-${size === 'sm' ? 'xs' : size === 'md' ? 'sm' : 'base'}`}>
          {statusLabel}
        </span>
      )}
    </motion.div>
  )
}