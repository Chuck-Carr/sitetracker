"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  KeyRound,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils/cn"
import { logout } from "@/features/auth/lib/actions"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/team", label: "Team", icon: Users },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col w-60 min-h-full bg-slate-900 text-slate-100">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-slate-700">
        <span className="text-lg font-bold tracking-tight">SiteStratus</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                active
                  ? "bg-slate-700 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Account + Logout */}
      <div className="p-3 border-t border-slate-700 space-y-1">
        <Link
          href="/account"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            pathname === "/account"
              ? "bg-slate-700 text-white"
              : "text-slate-300 hover:bg-slate-800 hover:text-white",
          )}
        >
          <KeyRound size={18} />
          Change Password
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
