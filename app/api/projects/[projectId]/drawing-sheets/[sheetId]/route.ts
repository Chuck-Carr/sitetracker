import type { NextRequest } from "next/server"
import { requireProjectAccess } from "@/lib/auth/permissions"
import { handleRoute, ok, notFound } from "@/lib/api/response"
import { getDrawingSheetWithUrl } from "@/features/drawings/lib/service"

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/projects/[projectId]/drawing-sheets/[sheetId]">,
): Promise<Response> {
  return handleRoute(async () => {
    const { projectId, sheetId } = await ctx.params
    const session = await requireProjectAccess(projectId)
    const result = await getDrawingSheetWithUrl(session.companyId, projectId, sheetId)
    if (!result) return notFound()
    return ok(result)
  })
}
