export const TEAM_COLORS = {
  ferrari: { primary: "#dc0000", accent: "#fff" },
  mercedes: { primary: "#00d2be", accent: "#111" },
  redbull: { primary: "#1e41ff", accent: "#fff" },
  mclaren: { primary: "#ff8700", accent: "#111" },
  alpine: { primary: "#0090ff", accent: "#fff" },
  astonmartin: { primary: "#006f62", accent: "#fff" },
  haas: { primary: "#b6babd", accent: "#111" },
  alphatauri: { primary: "#2b4562", accent: "#fff" },
  alfa: { primary: "#900000", accent: "#fff" },
  williams: { primary: "#005aff", accent: "#fff" },
} as const

export type TeamKey = keyof typeof TEAM_COLORS