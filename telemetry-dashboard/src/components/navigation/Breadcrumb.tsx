import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import Link from "next/link"
import { usePathname } from "next/navigation"

export default function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  // Build breadcrumb items with links
  const crumbs = segments.map((segment, idx) => {
    const href = "/" + segments.slice(0, idx + 1).join("/")
    // Capitalize and replace dashes with spaces
    const label = segment.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())
    return { href, label }
  })

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <Link href="/" passHref legacyBehavior>
            <BreadcrumbLink>Home</BreadcrumbLink>
          </Link>
        </BreadcrumbItem>
        {crumbs.map((crumb, idx) => (
          <span key={crumb.href} className="flex items-center">
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {idx === crumbs.length - 1 ? (
                <span className="text-muted-foreground">{crumb.label}</span>
              ) : (
                <Link href={crumb.href} passHref legacyBehavior>
                  <BreadcrumbLink>{crumb.label}</BreadcrumbLink>
                </Link>
              )}
            </BreadcrumbItem>
          </span>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}