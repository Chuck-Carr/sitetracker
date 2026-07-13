import { getSession } from "@/lib/auth/session"

export default async function DashboardPage() {
  const session = await getSession()

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-slate-500">Welcome back, {session?.name}</p>

      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">
          Dashboard metrics and activity feed will appear here in Phase 8.
        </p>
      </div>
    </div>
  )
}
