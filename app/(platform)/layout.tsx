import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileHeader } from "@/components/layout/mobile-header"

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect("/login")

  return (
    <div className="flex h-full">
      {/* Sidebar — only on large screens (1024px+). iPads in portrait get the mobile header. */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Mobile/tablet top bar with hamburger */}
      <MobileHeader />

      {/*
        Main content area.
        - relative + overflow-hidden so the drawing viewer can use absolute inset-0
        - pt-14 on mobile for the fixed header, removed on lg+
        - Regular pages add their own overflow-y-auto wrapper
      */}
      <main className="flex-1 relative overflow-hidden bg-slate-50 pt-14 lg:pt-0 min-w-0">
        {children}
      </main>
    </div>
  )
}
