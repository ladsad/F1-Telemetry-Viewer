import type { ReactNode } from "react"
import { ThemeProvider } from "@/components/ThemeProvider"
import "@/styles/globals.css"
import "@/styles/theme.css"

// Create a client component for the theme toggle
import ClientLayout from "@/components/ClientLayout"

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </ThemeProvider>
      </body>
    </html>
  )
}