import { requireCompanyRole } from "@/lib/auth/permissions"
import { handleRoute, ok, created } from "@/lib/api/response"
import { listProjects, createProject } from "@/features/projects/lib/service"
import { createProjectSchema } from "@/features/projects/schemas"

export async function GET(): Promise<Response> {
  return handleRoute(async () => {
    const session = await requireCompanyRole("VIEWER")
    const projects = await listProjects(session.companyId)
    return ok(projects)
  })
}

export async function POST(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const session = await requireCompanyRole("PROJECT_MANAGER")
    const body = await request.json()
    const data = createProjectSchema.parse(body)
    const project = await createProject(session.companyId, session.userId, data)
    return created(project)
  })
}
