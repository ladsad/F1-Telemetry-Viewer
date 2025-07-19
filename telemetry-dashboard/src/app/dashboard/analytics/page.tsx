"use client"

import { Suspense } from "react"
import PerformanceAnalyticsDashboard from "@/components/PerformanceAnalyticsDashboard"
import Sidebar from "@/components/layout/Sidebar"
import Header from "@/components/layout/Header"
import MobileNav from "@/components/layout/MobileNav"
import { useTheme } from "@/components/ThemeProvider"

export default function AnalyticsDashboardPage() {
  const sessionKey = "latest"
  const { colors } = useTheme()
  
  return (
    <>
      <Header />
      <div className="flex flex-col md:flex-row min-h-screen">
        <Sidebar />
        <div className="block md:hidden">
          <MobileNav />
        </div>
        <main className="flex-1 p-2 sm:p-4 md:p-6 lg:p-8 w-full max-w-full overflow-x-hidden">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-xl font-bold font-formula1">Performance Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Compare driver performance across sessions and laps
            </p>
          </div>
          
          <div className="w-full card-transition card-hover"
            style={{ borderColor: colors.primary, background: colors.primary + "10" }}
          >
            <Suspense fallback={<AnalyticsLoadingSkeleton />}>
              <PerformanceAnalyticsDashboard sessionKey={sessionKey} />
            </Suspense>
          </div>
        </main>
      </div>
    </>
  )
}

function AnalyticsLoadingSkeleton() {
  return (
    <div className="w-full space-y-4 p-4">
      <div className="h-24 bg-muted rounded-md animate-pulse" />
      <div className="h-64 bg-muted rounded-md animate-pulse" />
      <div className="h-48 bg-muted rounded-md animate-pulse" />
    </div>
  )
}