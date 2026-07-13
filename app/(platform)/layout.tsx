import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileHeader } from "@/components/layout/mobile-header"

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect("/login")

  return (
    <div className="flex h-full">
      {/* Desktop/tablet sidebar — hidden on mobile */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile: fixed top bar + hamburger drawer */}
      <MobileHeader />

      {/* Main content — offset by mobile header height on small screens */}
      <main className="flex-1 overflow-auto bg-slate-50 pt-14 md:pt-0 min-w-0">
        {children}
      </main>
    </div>
  )
}
