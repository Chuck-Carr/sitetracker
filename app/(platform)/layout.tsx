import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileHeader } from "@/components/layout/mobile-header"
import { BottomNav } from "@/components/layout/bottom-nav"

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect("/login")

  return (
    /*
      Outer: column flex so the mobile header sits above everything as part of
      normal document flow. This avoids the iOS Safari bug where position:fixed
      inside overflow:hidden breaks touch events entirely.
    */
    <div className="flex flex-col h-full">

      {/* Mobile/tablet top bar — in-flow, not fixed. xl+ hides it. */}
      <MobileHeader />

      {/* Inner row: sidebar + main */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar — only at 1280px+. iPads (portrait + landscape) keep the mobile header. */}
        <div className="hidden xl:flex">
          <Sidebar />
        </div>

        {/*
          Main content.
          - relative + overflow-hidden lets the drawing viewer use absolute inset-0
          - Regular pages wrap their content in overflow-y-auto
          - No pt-14 needed — the header is in-flow above this element
        */}
        <main className="flex-1 relative overflow-hidden bg-slate-50 min-w-0">
          {children}
        </main>
      </div>

      {/* Bottom tab bar — mobile/tablet only. Pure anchor links, no JS needed. */}
      <BottomNav />
    </div>
  )
}
