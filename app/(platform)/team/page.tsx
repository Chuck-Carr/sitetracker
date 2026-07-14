import { getSession } from "@/lib/auth/session"
import { listTeamMembers } from "@/features/team/lib/service"
import { TeamClient } from "@/features/team/components/TeamClient"
import { isAdmin } from "@/features/devices/schemas"

export default async function TeamPage() {
  const session = await getSession()
  if (!session) return null

  const members = await listTeamMembers(session.companyId)

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-8 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Team</h1>
          <p className="mt-1 text-sm text-slate-500">
            {members.filter((m) => m.status === "ACTIVE").length} active member
            {members.filter((m) => m.status === "ACTIVE").length !== 1 ? "s" : ""}
          </p>
        </div>

        <TeamClient
          initialMembers={members}
          currentUserId={session.userId}
          isAdmin={isAdmin(session.role)}
        />
      </div>
    </div>
  )
}
