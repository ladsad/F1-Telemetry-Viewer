import Link from "next/link"
import Image from "next/image"
import { useTheme } from "@/components/ThemeProvider"
import MobileNav from "./MobileNav"

export default function Header() {
  const { colors } = useTheme()
  
  return (
    <header 
      className="sticky top-0 z-40 w-full border-b backdrop-blur supports-[backdrop-filter]:bg-background/60"
      style={{ borderColor: colors.primary }}
    >
      <div className="container flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="md:hidden">
            <MobileNav />
          </div>
          
          <Link href="/" className="flex items-center space-x-2">
            <Image src="/logo.svg" alt="F1 Telemetry" width={32} height={32} />
            <span className="hidden sm:inline-block font-formula1 font-bold text-base lg:text-lg tracking-wider uppercase">
              F1 Telemetry
            </span>
          </Link>
        </div>
        
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-4">
          <Link href="/dashboard" className="px-2 py-1 rounded hover:bg-accent text-sm transition-colors font-formula1 uppercase tracking-wider">
            Dashboard
          </Link>
          <Link href="/dashboard/live" className="px-2 py-1 rounded hover:bg-accent text-sm transition-colors font-formula1 uppercase tracking-wider">
            Live
          </Link>
          <Link href="/dashboard/historic" className="px-2 py-1 rounded hover:bg-accent text-sm transition-colors font-formula1 uppercase tracking-wider">
            Historic
          </Link>
          <Link href="/dashboard/analytics" className="px-2 py-1 rounded hover:bg-accent text-sm transition-colors font-formula1 uppercase tracking-wider">
            Analytics
          </Link>
        </nav>
        
        <div className="flex items-center gap-2">
          {/* Optional: Additional header elements like user profile, notifications, etc */}
          <span className="h-8 w-8"></span> {/* Spacer for balance */}
        </div>
      </div>
    </header>
  )
}