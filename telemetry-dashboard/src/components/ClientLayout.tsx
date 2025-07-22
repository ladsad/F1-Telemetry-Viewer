"use client"

import type { ReactNode } from "react"
import dynamic from "next/dynamic"

// Now we can safely use ssr: false in a client component
const ThemeToggle = dynamic(() => import("@/components/ThemeToggle"), {
  ssr: false,
  loading: () => <div className="w-10 h-10 rounded-md bg-muted animate-pulse" />,
})

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="flex flex-col min-h-screen md:flex-row">
        {children}
      </div>
    </>
  )
}