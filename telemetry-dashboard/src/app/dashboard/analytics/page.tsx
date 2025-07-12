import PerformanceAnalyticsDashboard from "@/components/PerformanceAnalyticsDashboard"

export default function AnalyticsDashboardPage() {
  const sessionKey = "latest"
  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Analytics Dashboard</h1>
      <PerformanceAnalyticsDashboard sessionKey={sessionKey} />
    </main>
  )
}