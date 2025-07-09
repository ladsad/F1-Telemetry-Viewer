import type { ReactNode } from "react"

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Global header, nav, etc. */}
        {children}
      </body>
    </html>
  )
}