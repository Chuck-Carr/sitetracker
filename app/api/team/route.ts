import type { NextRequest } from "next/server"
import { requireCompanyRole, requireSession } from "@/lib/auth/permissions"
import { handleRoute, ok, created, forbidden } from "@/lib/api/response"
import { listTeamMembers, createTeamMember } from "@/features/team/lib/service"
import { z } from "zod"

const createMemberSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["COMPANY_ADMIN", "PROJECT_MANAGER", "TECHNICIAN", "VIEWER"]),
})

export async function GET(_req: NextRequest): Promise<Response> {
  return handleRoute(async () => {
    const session = await requireSession()
    const members = await listTeamMembers(session.companyId)
    return ok(members)
  })
}

export async function POST(req: NextRequest): Promise<Response> {
  return handleRoute(async () => {
    const session = await requireCompanyRole("COMPANY_ADMIN")
    const body = await req.json()
    const input = createMemberSchema.parse(body)
    const member = await createTeamMember(session.companyId, input)
    return created(member)
  })
}
