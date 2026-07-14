import type { NextRequest } from "next/server"
import { requireProjectAccess } from "@/lib/auth/permissions"
import { handleRoute, ok, noContent, forbidden } from "@/lib/api/response"
import { updateDevice, updateDeviceStatus, deleteDevice } from "@/features/devices/lib/service"
import {
  adminUpdateDeviceSchema,
  techUpdateDeviceSchema,
  isAdmin,
} from "@/features/devices/schemas"

type Ctx = { params: Promise<{ projectId: string; sheetId: string; deviceId: string }> }

export async function PATCH(req: NextRequest, ctx: Ctx): Promise<Response> {
  return handleRoute(async () => {
    const { projectId, deviceId } = await ctx.params
    const session = await requireProjectAccess(projectId)
    const body = await req.json()

    if (isAdmin(session.role)) {
      const input = adminUpdateDeviceSchema.parse(body)
      const device = await updateDevice(session.companyId, projectId, deviceId, input)
      return ok(device)
    }

    if (session.role === "TECHNICIAN") {
      const input = techUpdateDeviceSchema.parse(body)
      const device = await updateDeviceStatus(session.companyId, projectId, deviceId, input.status)
      return ok(device)
    }

    return forbidden("Insufficient permissions to update devices")
  })
}

export async function DELETE(_req: NextRequest, ctx: Ctx): Promise<Response> {
  return handleRoute(async () => {
    const { projectId, deviceId } = await ctx.params
    const session = await requireProjectAccess(projectId)
    if (!isAdmin(session.role)) return forbidden("Admin access required")
    await deleteDevice(session.companyId, projectId, deviceId)
    return noContent()
  })
}
