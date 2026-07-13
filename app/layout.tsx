import type { Metadata } from "next"
import { QueryProvider } from "@/components/layout/query-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: "SiteTracker",
  description: "Drawing-centric field execution platform for construction trades",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
