export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">SiteTracker</h1>
          <p className="mt-1 text-sm text-slate-500">Field execution platform</p>
        </div>
        {children}
      </div>
    </div>
  )
}
