import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink } from "@/components/ui/navigation-menu"
import Link from "next/link"
import { useTheme } from "@/components/ThemeProvider"
import Image from "next/image"

export default function Header() {
  const { colors } = useTheme()
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="flex items-center space-x-2">
            <Image src="/logo.svg" alt="F1 Telemetry" width={32} height={32} />
            <span className="font-formula1 font-bold text-lg tracking-wider uppercase">
              F1 Telemetry
            </span>
          </Link>
        </div>
        <nav className="flex items-center space-x-4 lg:space-x-6 mx-6">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link href="/live" passHref legacyBehavior>
                  <NavigationMenuLink className="px-3 py-2 rounded hover:bg-accent transition-colors font-formula1 uppercase tracking-wider">
                    Live
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
      </div>
    </header>
  )
}