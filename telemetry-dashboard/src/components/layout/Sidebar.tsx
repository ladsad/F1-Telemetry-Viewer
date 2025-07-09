import Link from "next/link"
import { Gauge, History, Map, Settings as SettingsIcon } from "lucide-react"

export default function Sidebar() {
  return (
    <aside className="w-full md:w-56 bg-background border-r min-h-screen flex flex-col py-6 px-2 md:px-4">
      <nav className="flex flex-col gap-2">
        <Link
          href="/live"
          className="flex items-center gap-3 px-3 py-2 rounded hover:bg-accent transition-colors font-medium"
        >
          <Gauge className="w-5 h-5" />
          Live Dashboard
        </Link>
        <Link
          href="/history"
          className="flex items-center gap-3 px-3 py-2 rounded hover:bg-accent transition-colors font-medium"
        >
          <History className="w-5 h-5" />
          Historic View
        </Link>
        <Link
          href="/track-map"
          className="flex items-center gap-3 px-3 py-2 rounded hover:bg-accent transition-colors font-medium"
        >
          <Map className="w-5 h-5" />
          Track Map
        </Link>
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded hover:bg-accent transition-colors font-medium"
        >
          <SettingsIcon className="w-5 h-5" />
          Settings
        </Link>
      </nav>
    </aside>
  )
}