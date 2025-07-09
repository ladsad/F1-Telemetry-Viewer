import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink } from "@/components/ui/navigation-menu"
import Link from "next/link"

export default function Header() {
  return (
    <header className="w-full bg-background border-b sticky top-0 z-50">
      <nav className="container mx-auto flex items-center justify-between py-3 px-4">
        <div className="font-bold text-xl tracking-tight text-primary">
          F1 Telemetry Dashboard
        </div>
        <NavigationMenu>
          <NavigationMenuList className="flex gap-2">
            <NavigationMenuItem>
              <Link href="/" passHref legacyBehavior>
                <NavigationMenuLink className="px-3 py-2 rounded hover:bg-accent transition-colors">
                  Home
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/live" passHref legacyBehavior>
                <NavigationMenuLink className="px-3 py-2 rounded hover:bg-accent transition-colors">
                  Live Telemetry
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/history" passHref legacyBehavior>
                <NavigationMenuLink className="px-3 py-2 rounded hover:bg-accent transition-colors">
                  Historical Data
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/drivers" passHref legacyBehavior>
                <NavigationMenuLink className="px-3 py-2 rounded hover:bg-accent transition-colors">
                  Drivers
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/about" passHref legacyBehavior>
                <NavigationMenuLink className="px-3 py-2 rounded hover:bg-accent transition-colors">
                  About
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </nav>
    </header>
  )
}