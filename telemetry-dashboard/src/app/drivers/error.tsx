"use client"

export default function DriversError({ error }: { error: Error }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh]">
      <span className="text-2xl text-destructive mb-2">Error</span>
      <span className="text-muted-foreground">{error.message || "Failed to load driver information."}</span>
    </div>
  )
}