"use client"

import { createContext, useContext, useState, ReactNode, useEffect } from "react"
import { TEAM_COLORS, TeamKey } from "@/lib/teamColors"

type ThemeContextType = {
  team: TeamKey
  setTeam: (team: TeamKey) => void
  colors: typeof TEAM_COLORS[TeamKey]
  mode: "dark" | "light"
  setMode: (mode: "dark" | "light") => void
}

const ThemeContext = createContext<ThemeContextType>({
  team: "ferrari",
  setTeam: () => {},
  colors: TEAM_COLORS.ferrari,
  mode: "dark",
  setMode: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [team, setTeam] = useState<TeamKey>("ferrari")
  const [mode, setMode] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme-mode") as "dark" | "light") || "dark"
    }
    return "dark"
  })

  useEffect(() => {
    document.documentElement.setAttribute("data-team", team)
  }, [team])

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", mode)
    localStorage.setItem("theme-mode", mode)
  }, [mode])

  const value: ThemeContextType = {
    team,
    setTeam,
    colors: TEAM_COLORS[team],
    mode,
    setMode,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}