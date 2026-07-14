import type { NextRequest } from "next/server"
import { requireProjectAccess } from "@/lib/auth/permissions"
import { handleRoute, ok, created, forbidden } from "@/lib/api/response"
import { listDevicesForSheet, createDevice } from "@/features/devices/lib/service"
import { createDeviceSchema, isAdmin } from "@/features/devices/schemas"

type Ctx = { params: Promise<{ projectId: string; sheetId: string }> }

export async function GET(_req: NextRequest, ctx: Ctx): Promise<Response> {
  return handleRoute(async () => {
    const { projectId, sheetId } = await ctx.params
    const session = await requireProjectAccess(projectId)
    const devices = await listDevicesForSheet(session.companyId, projectId, sheetId)
    return ok(devices)
  })
}

export async function POST(req: NextRequest, ctx: Ctx): Promise<Response> {
  return handleRoute(async () => {
    const { projectId, sheetId } = await ctx.params
    const session = await requireProjectAccess(projectId)
    if (!isAdmin(session.role)) return forbidden("Admin access required")
    const body = await req.json()
    const input = createDeviceSchema.parse(body)
    const device = await createDevice(session.companyId, projectId, session.userId, {
      ...input,
      drawingSheetId: sheetId,
    })
    return created(device)
  })
}
