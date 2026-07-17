import { getSession } from "@/lib/auth/session"
import { listProjects } from "@/features/projects/lib/service"
import { ProjectsClient } from "@/features/projects/components/projects-client"

export default async function ProjectsPage() {
  const session = await getSession()
  if (!session) return null

  const projects = await listProjects(session.companyId)
  const canCreate = session.role === "SUPER_ADMIN" || session.role === "COMPANY_ADMIN" || session.role === "PROJECT_MANAGER"

  return (
    <div className="h-full overflow-y-auto">
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="mt-1 text-sm text-slate-500">{projects.length} active project{projects.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <ProjectsClient initialProjects={projects} canCreate={canCreate} canDelete={canCreate} />
    </div>
    </div>
  )
}
