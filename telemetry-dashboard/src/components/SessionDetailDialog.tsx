"use client"

import { useState, Suspense } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import dynamic from "next/dynamic"
import LoadingSpinner from "@/components/ui/LoadingSpinner"

// Dynamically import heavy chart components
const TelemetryHistoryGrid = dynamic(
  () => import("@/components/TelemetryHistoryGrid"),
  {
    loading: () => <LoadingSpinner size="lg" label="Loading telemetry history..." />,
    ssr: false
  }
)

const LapTimeComparisonChart = dynamic(
  () => import("@/components/LapTimeComparisonChart"),
  {
    loading: () => <LoadingSpinner size="lg" label="Loading lap time comparison..." />,
    ssr: false
  }
)

const TireStrategyChart = dynamic(
  () => import("@/components/TireStrategyChart"),
  {
    loading: () => <LoadingSpinner size="lg" label="Loading tire strategy..." />,
    ssr: false
  }
)

type SessionDetailDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionKey: string
  driverNumber?: number
  driverNumbers?: number[]
}

export default function SessionDetailDialog({
  open,
  onOpenChange,
  sessionKey,
  driverNumber = 1,
  driverNumbers = [1, 16, 44]
}: SessionDetailDialogProps) {
  const [activeTab, setActiveTab] = useState("telemetry")
  
  if (!sessionKey) return null
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Session Details: {sessionKey}</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="telemetry">Telemetry History</TabsTrigger>
            <TabsTrigger value="laptimes">Lap Times</TabsTrigger>
            <TabsTrigger value="tires">Tire Strategy</TabsTrigger>
          </TabsList>
          
          <TabsContent value="telemetry" className="pt-4">
            <Suspense fallback={<LoadingSpinner size="lg" label="Loading telemetry history..." />}>
              <TelemetryHistoryGrid sessionKey={sessionKey} />
            </Suspense>
          </TabsContent>
          
          <TabsContent value="laptimes" className="pt-4">
            <Suspense fallback={<LoadingSpinner size="lg" label="Loading lap time comparison..." />}>
              <LapTimeComparisonChart 
                sessionKey={sessionKey} 
                driverNumbers={driverNumbers} 
              />
            </Suspense>
          </TabsContent>
          
          <TabsContent value="tires" className="pt-4">
            <Suspense fallback={<LoadingSpinner size="lg" label="Loading tire strategy..." />}>
              <TireStrategyChart 
                sessionKey={sessionKey} 
                driverNumber={driverNumber} 
              />
            </Suspense>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}