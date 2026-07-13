import type { NextRequest } from "next/server"
import { requireProjectAccess, requireProjectManager } from "@/lib/auth/permissions"
import { handleRoute, ok, noContent, notFound } from "@/lib/api/response"
import { getProject, updateProject, archiveProject } from "@/features/projects/lib/service"
import { updateProjectSchema } from "@/features/projects/schemas"

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/projects/[projectId]">,
): Promise<Response> {
  return handleRoute(async () => {
    const { projectId } = await ctx.params
    const session = await requireProjectAccess(projectId)
    const project = await getProject(session.companyId, projectId)
    if (!project) return notFound()
    return ok(project)
  })
}

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/projects/[projectId]">,
): Promise<Response> {
  return handleRoute(async () => {
    const { projectId } = await ctx.params
    const session = await requireProjectManager(projectId)
    const body = await request.json()
    const data = updateProjectSchema.parse(body)
    const project = await updateProject(session.companyId, projectId, data)
    return ok(project)
  })
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/projects/[projectId]">,
): Promise<Response> {
  return handleRoute(async () => {
    const { projectId } = await ctx.params
    const session = await requireProjectManager(projectId)
    await archiveProject(session.companyId, projectId)
    return noContent()
  })
}
