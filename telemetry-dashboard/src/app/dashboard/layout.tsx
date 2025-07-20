import type { ReactNode } from "react"
import { ThemeProvider } from "@/components/ThemeProvider"
import ThemeToggle from "@/components/ThemeToggle"
import "@/styles/globals.css"
import "@/styles/theme.css"
import { TelemetryProvider } from "@/context/TelemetryDataContext"
import ConnectionStatusIndicator from "@/components/ConnectionStatusIndicator"
import Header from "@/components/layout/Header"
import Sidebar from "@/components/layout/Sidebar"
import MobileNav from "@/components/layout/MobileNav"

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>F1 Telemetry Dashboard</title>
      </head>
      <body>
        <ThemeProvider>
          <div className="fixed top-4 right-4 z-50">
            <ThemeToggle />
          </div>
          <div className="flex flex-col md:flex-row min-h-screen">
            <Sidebar />
            <div className="block md:hidden">
              <MobileNav />
            </div>
            <main className="flex-1 p-2 sm:p-4 md:p-6 w-full max-w-full overflow-x-hidden relative">
              <TelemetryProvider>
                {/* Global connection status indicator */}
                <ConnectionStatusIndicator position="floating" service="all" />
                
                {children}
              </TelemetryProvider>
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}