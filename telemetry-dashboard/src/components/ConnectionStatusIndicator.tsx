"use client"

import { motion } from "framer-motion"
import { useTelemetry } from "@/context/TelemetryDataContext"
import { WiFi, WifiOff, Loader2, AlertTriangle } from "lucide-react"
import { ConnectionStatusIndicatorProps, ConnectionStatus } from "@/types"
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
  let StatusIcon = WiFi
  
  switch (status) {
    case 'open':
      statusColor = 'text-green-500'
      StatusIcon = WiFi
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