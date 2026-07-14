import type { NextRequest } from "next/server"
import { requireCompanyRole } from "@/lib/auth/permissions"
import { handleRoute, ok, noContent, forbidden } from "@/lib/api/response"
import { updateTeamMemberRole, setTeamMemberStatus } from "@/features/team/lib/service"
import { z } from "zod"

type Ctx = { params: Promise<{ userId: string }> }

const updateSchema = z.object({
  role: z.enum(["COMPANY_ADMIN", "PROJECT_MANAGER", "TECHNICIAN", "VIEWER"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
})

export async function PATCH(req: NextRequest, ctx: Ctx): Promise<Response> {
  return handleRoute(async () => {
    const { userId } = await ctx.params
    const session = await requireCompanyRole("COMPANY_ADMIN")

    // Prevent admins from changing their own role to avoid accidental lockout
    if (userId === session.userId) return forbidden("You cannot change your own role or status")

    const body = await req.json()
    const input = updateSchema.parse(body)

    if (input.role) {
      const member = await updateTeamMemberRole(session.companyId, userId, input.role)
      return ok(member)
    }
    if (input.status) {
      const member = await setTeamMemberStatus(session.companyId, userId, input.status)
      return ok(member)
    }

    return ok({ message: "No changes" })
  })
}
