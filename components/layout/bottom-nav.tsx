"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, FolderOpen, Users, LogOut } from "lucide-react"
import { cn } from "@/lib/utils/cn"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/team", label: "Team", icon: Users },
]

/**
 * Bottom tab bar for mobile/tablet.
 * Navigation uses plain <Link> (anchor) elements — works even before
 * React hydrates. Sign-out is a regular GET link to the logout endpoint.
 */
export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="xl:hidden flex flex-none border-t border-slate-700 bg-slate-900">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors",
              active ? "text-white" : "text-slate-400 hover:text-white",
            )}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 1.5} />
            {label}
          </Link>
        )
      })}

      {/* Sign out — plain GET link, no form/JS needed */}
      <a
        href="/api/auth/logout"
        className="flex flex-1 flex-col items-center justify-center gap-1 py-3 text-xs font-medium text-slate-400 hover:text-white transition-colors"
      >
        <LogOut size={22} strokeWidth={1.5} />
        Sign out
      </a>
    </nav>
  )
}
