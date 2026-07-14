import type { NextRequest } from "next/server"
import { requireProjectAccess } from "@/lib/auth/permissions"
import { handleRoute, created, forbidden } from "@/lib/api/response"
import { createDevicesBulk } from "@/features/devices/lib/service"
import { bulkCreateDeviceSchema, isAdmin } from "@/features/devices/schemas"

type Ctx = { params: Promise<{ projectId: string; sheetId: string }> }

export async function POST(req: NextRequest, ctx: Ctx): Promise<Response> {
  return handleRoute(async () => {
    const { projectId, sheetId } = await ctx.params
    const session = await requireProjectAccess(projectId)
    if (!isAdmin(session.role)) return forbidden("Admin access required")
    const body = await req.json()
    const input = bulkCreateDeviceSchema.parse(body)
    const devices = await createDevicesBulk(session.companyId, projectId, session.userId, {
      deviceTypeId: input.deviceTypeId,
      regions: input.regions,
      drawingSheetId: sheetId,
    })
    return created(devices)
  })
}
