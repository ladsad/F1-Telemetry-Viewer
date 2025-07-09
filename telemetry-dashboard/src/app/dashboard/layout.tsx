import type { ReactNode } from "react"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <section>
      {/* Dashboard sidebar/nav can go here */}
      {children}
    </section>
  )
}