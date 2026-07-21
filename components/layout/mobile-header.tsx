import Link from "next/link"
import { KeyRound } from "lucide-react"

export function MobileHeader() {
  return (
    <header className="xl:hidden flex flex-none items-center justify-between h-12 px-4 bg-slate-900 text-white border-b border-slate-700">
      <span className="text-base font-bold">SiteStratus</span>
      <Link
        href="/account"
        title="Change password"
        className="flex items-center justify-center w-9 h-9 rounded-md text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
      >
        <KeyRound size={18} />
      </Link>
    </header>
  )
}
