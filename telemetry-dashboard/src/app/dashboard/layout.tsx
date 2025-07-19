import { ReactNode } from "react"
import { useTheme } from "@/components/ThemeProvider"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { colors } = useTheme()
  return (
    <section
      style={{
        background: colors.primary + "10",
        borderColor: colors.primary,
        color: colors.accent,
      }}
    >
      {/* Dashboard sidebar/nav can go here */}
      {children}
    </section>
  )
}