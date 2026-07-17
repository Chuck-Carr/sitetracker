import type { NextRequest } from "next/server"
import { requireProjectManager } from "@/lib/auth/permissions"
import { handleRoute, noContent } from "@/lib/api/response"
import { deleteDrawingSet } from "@/features/drawings/lib/service"

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ projectId: string; setId: string }> },
): Promise<Response> {
  return handleRoute(async () => {
    const { projectId, setId } = await ctx.params
    const session = await requireProjectManager(projectId)
    await deleteDrawingSet(session.companyId, projectId, setId)
    return noContent()
  })
}
