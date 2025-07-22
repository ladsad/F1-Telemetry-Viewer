"use client"

import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from "react"
import { TEAM_COLORS, TeamKey } from "@/lib/teamColors"

type ThemeMode = "dark" | "light" | "auto"

type ThemeContextType = {
  team: TeamKey
  setTeam: (team: TeamKey) => void
  colors: { primary: string; accent: string }
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  actualMode: "dark" | "light" // The resolved mode (for auto mode)
  isSystemDark: boolean
  // Enhanced F1-specific theme utilities
  getTeamGradient: () => string
  getContrastColor: () => string
  getAccentColor: () => string
  // Theme presets
  applyTeamPreset: (teamKey: TeamKey) => void
  resetToDefaults: () => void
  // Accessibility helpers
  highContrastMode: boolean
  setHighContrastMode: (enabled: boolean) => void
  // Animation preferences
  reduceMotion: boolean
  setReduceMotion: (enabled: boolean) => void
}

const ThemeContext = createContext<ThemeContextType>({
  team: "ferrari",
  setTeam: () => {},
  colors: { primary: "#dc0000", accent: "#fff" },
  mode: "dark",
  setMode: () => {},
  actualMode: "dark",
  isSystemDark: false,
  getTeamGradient: () => "",
  getContrastColor: () => "",
  getAccentColor: () => "",
  applyTeamPreset: () => {},
  resetToDefaults: () => {},
  highContrastMode: false,
  setHighContrastMode: () => {},
  reduceMotion: false,
  setReduceMotion: () => {},
})

// Enhanced team gradients for F1 racing aesthetics
const TEAM_GRADIENTS: Record<TeamKey, string> = {
  ferrari: "linear-gradient(135deg, #dc0000 0%, #8b0000 50%, #ff1e1e 100%)",
  mercedes: "linear-gradient(135deg, #00d2be 0%, #00a8a8 50%, #1afcd8 100%)",
  redbull: "linear-gradient(135deg, #1e41ff 0%, #0c1957 50%, #4169ff 100%)",
  mclaren: "linear-gradient(135deg, #ff8700 0%, #cc5500 50%, #ffad33 100%)",
  alpine: "linear-gradient(135deg, #0090ff 0%, #0066cc 50%, #33a3ff 100%)",
  astonmartin: "linear-gradient(135deg, #006f62 0%, #004d45 50%, #00a88f 100%)",
  haas: "linear-gradient(135deg, #b6babd 0%, #8e9499 50%, #d4d7da 100%)",
  alphatauri: "linear-gradient(135deg, #2b4562 0%, #1a2a3d 50%, #47688a 100%)",
  alfa: "linear-gradient(135deg, #900000 0%, #660000 50%, #b30000 100%)",
  williams: "linear-gradient(135deg, #005aff 0%, #0044cc 50%, #3374ff 100%)",
}

// High contrast variants for accessibility
type HighContrastColor = { primary: string; accent: string }
const HIGH_CONTRAST_COLORS: Record<TeamKey, HighContrastColor> = {
  ferrari: { primary: "#ff0000", accent: "#ffffff" },
  mercedes: { primary: "#00ffff", accent: "#000000" },
  redbull: { primary: "#0066ff", accent: "#ffffff" },
  mclaren: { primary: "#ffaa00", accent: "#000000" },
  alpine: { primary: "#00aaff", accent: "#ffffff" },
  astonmartin: { primary: "#00aa88", accent: "#ffffff" },
  haas: { primary: "#cccccc", accent: "#000000" },
  alphatauri: { primary: "#5577aa", accent: "#ffffff" },
  alfa: { primary: "#cc0000", accent: "#ffffff" },
  williams: { primary: "#0077ff", accent: "#ffffff" },
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialize team from localStorage or default to ferrari
  const [team, setTeamState] = useState<TeamKey>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("f1-theme-team")
      return (saved as TeamKey) || "ferrari"
    }
    return "ferrari"
  })

  // Initialize mode from localStorage or system preference
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("f1-theme-mode") as ThemeMode) || "auto"
    }
    return "auto"
  })

  // Track system dark mode preference
  const [isSystemDark, setIsSystemDark] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
    }
    return true
  })

  // Accessibility states
  const [highContrastMode, setHighContrastMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("f1-theme-high-contrast") === "true"
    }
    return false
  })

  const [reduceMotion, setReduceMotion] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("f1-theme-reduce-motion") === "true" ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      )
    }
    return false
  })

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === "undefined") return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = (e: MediaQueryListEvent) => {
      setIsSystemDark(e.matches)
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  // Listen for system motion preference changes
  useEffect(() => {
    if (typeof window === "undefined") return

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const handleChange = (e: MediaQueryListEvent) => {
      if (localStorage.getItem("f1-theme-reduce-motion") === null) {
        setReduceMotion(e.matches)
      }
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  // Calculate actual mode (resolve auto mode)
  const actualMode = useMemo(() => {
    return mode === "auto" ? (isSystemDark ? "dark" : "light") : mode
  }, [mode, isSystemDark])

  // Get current colors (with high contrast support)
  const colors = useMemo(() => {
    return highContrastMode ? HIGH_CONTRAST_COLORS[team] : TEAM_COLORS[team]
  }, [team, highContrastMode])

  // Enhanced theme utility functions
  const getTeamGradient = useCallback(() => {
    return TEAM_GRADIENTS[team]
  }, [team])

  const getContrastColor = useCallback(() => {
    // Calculate best contrast color based on primary color brightness
    const hex = colors.primary.replace("#", "")
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness > 128 ? "#000000" : "#ffffff"
  }, [colors.primary])

  const getAccentColor = useCallback(() => {
    return actualMode === "dark" ? colors.accent : colors.primary
  }, [colors, actualMode])

  // Enhanced setters with localStorage persistence
  const setTeam = useCallback((newTeam: TeamKey) => {
    setTeamState(newTeam)
    localStorage.setItem("f1-theme-team", newTeam)
  }, [])

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode)
    localStorage.setItem("f1-theme-mode", newMode)
  }, [])

  const setHighContrastModeWithPersistence = useCallback((enabled: boolean) => {
    setHighContrastMode(enabled)
    localStorage.setItem("f1-theme-high-contrast", String(enabled))
  }, [])

  const setReduceMotionWithPersistence = useCallback((enabled: boolean) => {
    setReduceMotion(enabled)
    localStorage.setItem("f1-theme-reduce-motion", String(enabled))
  }, [])

  // Team preset functionality
  const applyTeamPreset = useCallback((teamKey: TeamKey) => {
    setTeam(teamKey)
    // You could add additional preset behaviors here
    // For example, certain teams might default to specific modes
  }, [setTeam])

  const resetToDefaults = useCallback(() => {
    setTeam("ferrari")
    setMode("auto")
    setHighContrastModeWithPersistence(false)
    setReduceMotionWithPersistence(false)
  }, [setTeam, setMode, setHighContrastModeWithPersistence, setReduceMotionWithPersistence])

  // Apply theme to document
  useEffect(() => {
    if (typeof window === "undefined") return

    const root = document.documentElement

    // Set team data attribute
    root.setAttribute("data-team", team)
    
    // Set theme mode
    root.setAttribute("data-theme", actualMode)
    
    // Set accessibility attributes
    root.setAttribute("data-high-contrast", String(highContrastMode))
    root.setAttribute("data-reduce-motion", String(reduceMotion))

    // Apply CSS custom properties for dynamic theming
    root.style.setProperty("--team-primary", colors.primary)
    root.style.setProperty("--team-accent", colors.accent)
    root.style.setProperty("--team-gradient", getTeamGradient())
    root.style.setProperty("--contrast-color", getContrastColor())
    
    // Apply motion preference
    if (reduceMotion) {
      root.style.setProperty("--animation-duration", "0.01ms")
      root.style.setProperty("--transition-duration", "0.01ms")
    } else {
      root.style.removeProperty("--animation-duration")
      root.style.removeProperty("--transition-duration")
    }

    // Set meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", colors.primary)
    } else {
      const meta = document.createElement("meta")
      meta.name = "theme-color"
      meta.content = colors.primary
      document.head.appendChild(meta)
    }

  }, [team, actualMode, colors, highContrastMode, reduceMotion, getTeamGradient, getContrastColor])

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<ThemeContextType>(() => ({
    team,
    setTeam,
    colors,
    mode,
    setMode,
    actualMode,
    isSystemDark,
    getTeamGradient,
    getContrastColor,
    getAccentColor,
    applyTeamPreset,
    resetToDefaults,
    highContrastMode,
    setHighContrastMode: setHighContrastModeWithPersistence,
    reduceMotion,
    setReduceMotion: setReduceMotionWithPersistence,
  }), [
    team, setTeam, colors, mode, setMode, actualMode, isSystemDark,
    getTeamGradient, getContrastColor, getAccentColor, applyTeamPreset, resetToDefaults,
    highContrastMode, setHighContrastModeWithPersistence,
    reduceMotion, setReduceMotionWithPersistence
  ])

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

// Enhanced hook for F1-specific theme utilities
export function useF1Theme() {
  const theme = useTheme()
  
  return {
    ...theme,
    // Additional F1-specific utilities
    isFerrari: theme.team === "ferrari",
    isMercedes: theme.team === "mercedes",
    isRedBull: theme.team === "redbull",
    // Get themed shadow
    getTeamShadow: (intensity: "sm" | "md" | "lg" = "md") => {
      const shadows = {
        sm: `0 1px 3px ${theme.colors.primary}20`,
        md: `0 4px 12px ${theme.colors.primary}30`,
        lg: `0 12px 24px ${theme.colors.primary}40`
      }
      return shadows[intensity]
    },
    // Get team-specific animation duration
    getAnimationDuration: (base: number = 300) => {
      return theme.reduceMotion ? 0 : base
    },
    // Get responsive team colors
    getResponsiveColor: (opacity: number = 1) => {
      return `${theme.colors.primary}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`
    }
  }
}