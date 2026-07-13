// Simple static top bar — no hamburger, no JavaScript state.
// Navigation is in BottomNav (bottom-nav.tsx).

export function MobileHeader() {
  return (
    <header className="lg:hidden flex flex-none items-center h-12 px-4 bg-slate-900 text-white border-b border-slate-700">
      <span className="text-base font-bold">SiteTracker</span>
    </header>
  )
}
