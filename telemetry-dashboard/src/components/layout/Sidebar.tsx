import Link from "next/link"
import { useTheme } from "@/components/ThemeProvider"
import { 
  Gauge, History, LineChart, Map, Settings, Activity
} from "lucide-react"

export default function Sidebar() {
  const { colors } = useTheme()
  
  return (
    <aside
      className="hidden md:flex md:flex-col md:w-56 lg:w-64 bg-background border-r min-h-screen py-6 px-2 lg:px-4 overflow-y-auto"
      style={{
        background: colors.primary + "10",
        borderColor: colors.primary,
        color: colors.accent,
      }}
    >
      <div className="mb-6 px-4">
        <h2 className="text-xl font-bold font-formula1">F1 Telemetry</h2>
      </div>
      
      <nav className="flex flex-col gap-1">
        <NavLink href="/dashboard" icon={<Gauge />}>Dashboard</NavLink>
        <NavLink href="/dashboard/live" icon={<Activity />}>Live Telemetry</NavLink>
        <NavLink href="/dashboard/historic" icon={<History />}>Historic View</NavLink>
        <NavLink href="/dashboard/analytics" icon={<LineChart />}>Analytics</NavLink>
        <NavLink href="/dashboard/track" icon={<Map />}>Track Map</NavLink>
        <NavLink href="/settings" icon={<Settings />}>Settings</NavLink>
      </nav>
      
      <div className="mt-auto pt-6 px-4 text-xs text-muted-foreground">
        <p>© 2023 F1 Telemetry</p>
        <p>Data provided by OpenF1</p>
      </div>
    </aside>
  )
}

function NavLink({ 
  href, 
  icon, 
  children 
}: { 
  href: string; 
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-2 rounded hover:bg-accent transition-colors font-formula1 uppercase tracking-wider"
    >
      {icon}
      <span>{children}</span>
    </Link>
  )
}