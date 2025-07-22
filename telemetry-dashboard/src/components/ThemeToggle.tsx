"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "@/components/ThemeProvider"
import { Button } from "@/components/ui/button"
import AnimatedButton from "@/components/AnimatedButton"

export default function ThemeToggle() {
  const { mode, setMode, actualMode, team, colors } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Only render after hydration to prevent mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-md bg-muted animate-pulse" />
    )
  }

  const modes = [
    { key: 'light' as const, icon: Sun, label: 'Light' },
    { key: 'dark' as const, icon: Moon, label: 'Dark' },
    { key: 'auto' as const, icon: Monitor, label: 'Auto' }
  ]

  const currentModeIndex = modes.findIndex(m => m.key === mode)
  const nextMode = modes[(currentModeIndex + 1) % modes.length]

  return (
    <AnimatedButton
      variant="ghost"
      size="sm"
      onClick={() => setMode(nextMode.key)}
      className="relative w-10 h-10 p-0"
      customColor={colors.primary}
      animationIntensity="subtle"
      aria-label={`Switch to ${nextMode.label} theme`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {React.createElement(modes[currentModeIndex].icon, {
            className: "w-5 h-5"
          })}
        </motion.div>
      </AnimatePresence>
    </AnimatedButton>
  )
}