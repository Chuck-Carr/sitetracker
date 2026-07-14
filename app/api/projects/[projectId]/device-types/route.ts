import type { NextRequest } from "next/server"
import { requireProjectAccess } from "@/lib/auth/permissions"
import { handleRoute, ok } from "@/lib/api/response"
import { listDeviceTypes } from "@/features/devices/lib/service"

type Ctx = { params: Promise<{ projectId: string }> }

export async function GET(_req: NextRequest, ctx: Ctx): Promise<Response> {
  return handleRoute(async () => {
    const { projectId } = await ctx.params
    const session = await requireProjectAccess(projectId)
    const types = await listDeviceTypes(session.companyId)
    return ok(types)
  })
}
