import type { NextRequest } from "next/server"
import { requireProjectAccess, requireProjectManager } from "@/lib/auth/permissions"
import { handleRoute, ok, created } from "@/lib/api/response"
import { listDrawingSets, createDrawingSetFromUpload } from "@/features/drawings/lib/service"
import { completeDrawingSetUploadSchema } from "@/features/drawings/schemas"

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/projects/[projectId]/drawing-sets">,
): Promise<Response> {
  return handleRoute(async () => {
    const { projectId } = await ctx.params
    const session = await requireProjectAccess(projectId)
    const sets = await listDrawingSets(session.companyId, projectId)
    return ok(sets)
  })
}

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/projects/[projectId]/drawing-sets">,
): Promise<Response> {
  return handleRoute(async () => {
    const { projectId } = await ctx.params
    const session = await requireProjectManager(projectId)
    const body = await request.json()
    const input = completeDrawingSetUploadSchema.parse(body)
    const result = await createDrawingSetFromUpload(
      session.companyId,
      projectId,
      session.userId,
      input,
    )
    return created(result)
  })
}
