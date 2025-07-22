"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"
import Sidebar from "@/components/layout/Sidebar"
import Header from "@/components/layout/Header"
import MobileNav from "@/components/layout/MobileNav"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

// Settings-specific dynamic imports
const ThemeToggle = dynamic(() => import("@/components/ThemeToggle"), {
  loading: () => <div className="w-10 h-10 bg-muted rounded animate-pulse" />,
  ssr: false
})

const ConnectionStatusIndicator = dynamic(() => import("@/components/ConnectionStatusIndicator"), {
  loading: () => <div className="w-20 h-6 bg-muted rounded animate-pulse" />,
  ssr: false
})

function SettingsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-muted rounded animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 w-32 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-4 w-full bg-muted rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                <div className="h-8 w-20 bg-muted rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function SettingsContent() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-formula1">Dashboard Settings</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Dark/Light Mode</span>
              <Suspense fallback={<div className="w-10 h-10 bg-muted rounded animate-pulse" />}>
                <ThemeToggle />
              </Suspense>
            </div>
            <div className="text-sm text-muted-foreground">
              Toggle between dark and light themes
            </div>
          </CardContent>
        </Card>

        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Telemetry</span>
                <Suspense fallback={<div className="w-16 h-6 bg-muted rounded animate-pulse" />}>
                  <ConnectionStatusIndicator service="telemetry" size="sm" />
                </Suspense>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Timing</span>
                <Suspense fallback={<div className="w-16 h-6 bg-muted rounded animate-pulse" />}>
                  <ConnectionStatusIndicator service="timing" size="sm" />
                </Suspense>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Positions</span>
                <Suspense fallback={<div className="w-16 h-6 bg-muted rounded animate-pulse" />}>
                  <ConnectionStatusIndicator service="positions" size="sm" />
                </Suspense>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Performance optimization settings coming soon...
            </div>
          </CardContent>
        </Card>

        {/* Data Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Data cache and storage settings coming soon...
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <>
      <Header />
      <div className="flex flex-col md:flex-row min-h-screen">
        <Sidebar />
        <div className="block md:hidden">
          <MobileNav />
        </div>
        <main className="flex-1 p-2 sm:p-4 md:p-6 w-full max-w-full overflow-x-hidden">
          <Suspense fallback={<SettingsLoadingSkeleton />}>
            <SettingsContent />
          </Suspense>
        </main>
      </div>
    </>
  )
}