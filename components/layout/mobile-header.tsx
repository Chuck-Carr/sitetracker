"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, LayoutDashboard, FolderOpen, LogOut } from "lucide-react"
import { cn } from "@/lib/utils/cn"
import { logout } from "@/features/auth/lib/actions"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderOpen },
]

export function MobileHeader() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* Top bar — in document flow, not fixed */}
      <header className="lg:hidden flex items-center h-14 px-4 bg-slate-900 text-white border-b border-slate-700 shrink-0">
        <span className="text-base font-bold flex-1">SiteTracker</span>
        <button
          onClick={() => setOpen((v) => !v)}
          className="p-2 -mr-2 rounded-md hover:bg-slate-700 transition-colors"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Slide-in drawer */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setOpen(false)}
          />
          {/* Drawer — slides in from left below the in-flow header */}
          <nav className="fixed inset-x-0 top-14 bottom-0 left-0 z-50 w-72 bg-slate-900 text-slate-100 flex flex-col">
            <div className="flex-1 py-4 px-3 space-y-1">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors",
                    pathname.startsWith(href)
                      ? "bg-slate-700 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white",
                  )}
                >
                  <Icon size={20} />
                  {label}
                </Link>
              ))}
            </div>
            <div className="p-3 border-t border-slate-700">
              <form action={logout}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 px-4 py-3 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <LogOut size={20} />
                  Sign out
                </button>
              </form>
            </div>
          </nav>
        </>
      )}
    </>
  )
}
