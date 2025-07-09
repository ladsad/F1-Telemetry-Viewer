import { useState } from "react"
import Link from "next/link"
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet"
import { Menu } from "lucide-react"

export default function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            aria-label="Open navigation"
            className="p-2 rounded-md hover:bg-accent focus:outline-none focus:ring"
          >
            <Menu className="w-6 h-6" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <nav className="flex flex-col gap-1 mt-8 px-4">
            <Link
              href="/"
              className="py-3 px-2 rounded hover:bg-accent font-medium"
              onClick={() => setOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/live"
              className="py-3 px-2 rounded hover:bg-accent font-medium"
              onClick={() => setOpen(false)}
            >
              Live Dashboard
            </Link>
            <Link
              href="/history"
              className="py-3 px-2 rounded hover:bg-accent font-medium"
              onClick={() => setOpen(false)}
            >
              Historic View
            </Link>
            <Link
              href="/track-map"
              className="py-3 px-2 rounded hover:bg-accent font-medium"
              onClick={() => setOpen(false)}
            >
              Track Map
            </Link>
            <Link
              href="/settings"
              className="py-3 px-2 rounded hover:bg-accent font-medium"
              onClick={() => setOpen(false)}
            >
              Settings
            </Link>
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  )
}