import type { NextRequest } from "next/server"
import { requireCompanyRole } from "@/lib/auth/permissions"
import { handleRoute, noContent } from "@/lib/api/response"
import { removeProjectMember } from "@/features/projects/lib/service"

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/projects/[projectId]/members/[memberId]">,
): Promise<Response> {
  return handleRoute(async () => {
    const { projectId, memberId } = await ctx.params
    const session = await requireCompanyRole("COMPANY_ADMIN")
    await removeProjectMember(session.companyId, projectId, memberId)
    return noContent()
  })
}
