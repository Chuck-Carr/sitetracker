import type { NextRequest } from "next/server"
import { requireCompanyRole, requireProjectAccess } from "@/lib/auth/permissions"
import { handleRoute, ok, created } from "@/lib/api/response"
import { listProjectMembers, addProjectMember } from "@/features/projects/lib/service"
import { z } from "zod"

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["MANAGER", "TECHNICIAN", "VIEWER"]).default("TECHNICIAN"),
})

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/projects/[projectId]/members">,
): Promise<Response> {
  return handleRoute(async () => {
    const { projectId } = await ctx.params
    const session = await requireProjectAccess(projectId)
    const members = await listProjectMembers(session.companyId, projectId)
    return ok(members)
  })
}

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/projects/[projectId]/members">,
): Promise<Response> {
  return handleRoute(async () => {
    const { projectId } = await ctx.params
    // Only company admins and above can manage project membership
    const session = await requireCompanyRole("COMPANY_ADMIN")
    const body = await req.json()
    const { userId, role } = addMemberSchema.parse(body)
    const member = await addProjectMember(session.companyId, projectId, userId, role)
    return created(member)
  })
}
