import type { NextRequest } from "next/server"
import { requireProjectAccess } from "@/lib/auth/permissions"
import { handleRoute, ok } from "@/lib/api/response"
import { listDrawingSheets } from "@/features/drawings/lib/service"

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/projects/[projectId]/drawing-sheets">,
): Promise<Response> {
  return handleRoute(async () => {
    const { projectId } = await ctx.params
    const session = await requireProjectAccess(projectId)
    const drawingSetId = request.nextUrl.searchParams.get("drawingSetId") ?? undefined
    const sheets = await listDrawingSheets(session.companyId, projectId, drawingSetId)
    return ok(sheets)
  })
}
