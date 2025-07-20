import { Loader2 } from "lucide-react"

export default function LiveDashboardLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="relative w-20 h-20 mb-6">
        <Loader2 className="w-20 h-20 text-primary animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-formula1 text-lg">F1</span>
        </div>
      </div>
      <h2 className="text-xl font-bold font-formula1 mb-2">
        Connecting to Live Telemetry
      </h2>
      <p className="text-muted-foreground text-center max-w-md">
        Establishing connection to real-time data feeds. This may take a moment...
      </p>
    </div>
  )
}