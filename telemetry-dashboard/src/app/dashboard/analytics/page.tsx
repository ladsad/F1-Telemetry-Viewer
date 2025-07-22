"use client"

import { useState, useEffect, Suspense } from "react"
import dynamic from "next/dynamic"
import Sidebar from "@/components/layout/Sidebar"
import Header from "@/components/layout/Header"
import MobileNav from "@/components/layout/MobileNav"
import { TelemetryProvider } from "@/context/TelemetryDataContext"
import LoadingSpinner from "@/components/ui/LoadingSpinner"

// Route-specific dynamic imports for analytics
const PerformanceAnalyticsDashboard = dynamic(() => import("@/components/PerformanceAnalyticsDashboard"), {
  loading: () => <AnalyticsLoadingSkeleton />,
  ssr: false
})

const LapTimeComparisonChart = dynamic(() => import("@/components/LapTimeComparisonChart"), {
  loading: () => <ChartLoadingSkeleton title="Lap Time Comparison" />,
  ssr: false
})

const DeltaTimeChart = dynamic(() => import("@/components/DeltaTimeChart"), {
  loading: () => <ChartLoadingSkeleton title="Delta Time Analysis" />,
  ssr: false
})

const TireStrategyChart = dynamic(() => import("@/components/TireStrategyChart"), {
  loading: () => <ChartLoadingSkeleton title="Tire Strategy" />,
  ssr: false
})

// Analytics-specific loading skeletons
function AnalyticsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-32 h-10 bg-muted rounded animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-64 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  )
}

function ChartLoadingSkeleton({ title }: { title: string }) {
  return (
    <div className="p-6 border rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-40 bg-muted rounded animate-pulse" />
        <div className="flex space-x-2">
          <div className="w-20 h-8 bg-muted rounded animate-pulse" />
          <div className="w-16 h-8 bg-muted rounded animate-pulse" />
        </div>
      </div>
      <div className="h-64 bg-muted rounded-lg animate-pulse flex items-center justify-center">
        <div className="text-center space-y-2">
          <LoadingSpinner size="md" />
          <p className="text-sm text-muted-foreground">Loading {title.toLowerCase()}...</p>
        </div>
      </div>
    </div>
  )
}

function AnalyticsContent() {
  const sessionKey = "latest"
  const driverNumbers = [1, 16, 44, 63]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-formula1">Performance Analytics</h1>
      
      {/* Main Analytics Dashboard */}
      <Suspense fallback={<AnalyticsLoadingSkeleton />}>
        <PerformanceAnalyticsDashboard sessionKey={sessionKey} />
      </Suspense>

      {/* Comparison Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<ChartLoadingSkeleton title="Lap Time Comparison" />}>
          <LapTimeComparisonChart
            sessionKey={sessionKey}
            driverNumbers={driverNumbers}
          />
        </Suspense>

        <Suspense fallback={<ChartLoadingSkeleton title="Delta Time Analysis" />}>
          <DeltaTimeChart
            sessionKey={sessionKey}
            driverNumbers={driverNumbers}
          />
        </Suspense>

        <Suspense fallback={<ChartLoadingSkeleton title="Tire Strategy" />}>
          <TireStrategyChart
            sessionKey={sessionKey}
            driverNumber={driverNumbers[0]}
          />
        </Suspense>

        <div className="p-6 border rounded-lg">
          <h3 className="font-semibold mb-4">Additional Analytics</h3>
          <p className="text-muted-foreground">More analytics components coming soon...</p>
        </div>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const sessionKey = "latest"

  return (
    <>
      <Header />
      <div className="flex flex-col md:flex-row min-h-screen">
        <Sidebar />
        <div className="block md:hidden">
          <MobileNav />
        </div>
        <main className="flex-1 p-2 sm:p-4 md:p-6 w-full max-w-full overflow-x-hidden">
          <TelemetryProvider initialSessionKey={sessionKey}>
            <Suspense fallback={<AnalyticsLoadingSkeleton />}>
              <AnalyticsContent />
            </Suspense>
          </TelemetryProvider>
        </main>
      </div>
    </>
  )
}