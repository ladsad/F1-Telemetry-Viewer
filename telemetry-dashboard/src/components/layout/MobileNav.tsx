"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet"
import { Menu, X, Gauge, History, LineChart, Map, Settings, Activity } from "lucide-react"
import { useTheme } from "@/components/ThemeProvider"

export default function MobileNav() {
  const [open, setOpen] = useState(false)
  const { colors } = useTheme()
  
  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            aria-label="Open navigation"
            className="p-2 rounded-md hover:bg-accent focus:outline-none focus:ring"
          >
            <Menu className="w-5 h-5" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[75vw] max-w-[300px] p-0">
          <div
            className="flex flex-col h-full py-4"
            style={{
              background: colors.primary + "10",
              color: colors.accent,
            }}
          >
            <div className="flex items-center justify-between px-4 pb-4 border-b mb-4">
              <Link 
                href="/" 
                className="flex items-center gap-2"
                onClick={() => setOpen(false)}
              >
                <Image src="/logo.svg" alt="F1 Telemetry" width={24} height={24} />
                <span className="font-formula1 font-bold text-base tracking-wider uppercase">
                  F1 Telemetry
                </span>
              </Link>
              <button 
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="p-1 rounded hover:bg-accent/20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <nav className="flex flex-col px-2 space-y-1">
              <MobileNavLink href="/dashboard" icon={<Gauge size={18} />} onClick={() => setOpen(false)}>
                Dashboard
              </MobileNavLink>
              <MobileNavLink href="/dashboard/live" icon={<Activity size={18} />} onClick={() => setOpen(false)}>
                Live Telemetry
              </MobileNavLink>
              <MobileNavLink href="/dashboard/historic" icon={<History size={18} />} onClick={() => setOpen(false)}>
                Historic View
              </MobileNavLink>
              <MobileNavLink href="/dashboard/analytics" icon={<LineChart size={18} />} onClick={() => setOpen(false)}>
                Analytics
              </MobileNavLink>
              <MobileNavLink href="/dashboard/track" icon={<Map size={18} />} onClick={() => setOpen(false)}>
                Track Map
              </MobileNavLink>
              <MobileNavLink href="/settings" icon={<Settings size={18} />} onClick={() => setOpen(false)}>
                Settings
              </MobileNavLink>
            </nav>
            
            <div className="mt-auto pt-4 px-4 border-t text-xs text-muted-foreground">
              <p>© 2023 F1 Telemetry</p>
              <p>Data provided by OpenF1</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function MobileNavLink({ 
  href, 
  icon, 
  onClick,
  children 
}: { 
  href: string; 
  icon: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded hover:bg-accent/20 transition-colors"
      onClick={onClick}
    >
      {icon}
      <span className="text-sm font-formula1 tracking-wide">{children}</span>
    </Link>
  )
}