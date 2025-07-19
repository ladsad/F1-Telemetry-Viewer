import type { ReactNode } from "react"
import { ThemeProvider } from "@/components/ThemeProvider"
import ThemeToggle from "@/components/ThemeToggle"
import "@/styles/globals.css"
import "@/styles/theme.css"

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <div className="fixed top-4 right-4 z-50">
            <ThemeToggle />
          </div>
          <div className="flex flex-col min-h-screen md:flex-row">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}