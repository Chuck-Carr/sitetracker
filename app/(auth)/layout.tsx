export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex items-center justify-center bg-slate-50 px-4 py-8 safe-area-inset">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-slate-900">SiteTracker</h1>
          <p className="mt-1 text-sm text-slate-500">Field execution platform</p>
        </div>
        {children}
      </div>
    </div>
  )
}
