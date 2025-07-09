export default function SettingsLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh]">
      <span className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mb-4" />
      <span className="text-lg text-muted-foreground">Loading settings...</span>
    </div>
  )
}