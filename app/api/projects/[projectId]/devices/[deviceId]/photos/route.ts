import type { NextRequest } from "next/server"
import { requireProjectAccess } from "@/lib/auth/permissions"
import { handleRoute, ok, created, forbidden } from "@/lib/api/response"
import { listDevicePhotos, createDevicePhoto } from "@/features/devices/lib/service"
import { completeDevicePhotoUploadSchema, canManageDevicePhotos } from "@/features/devices/schemas"

type Ctx = { params: Promise<{ projectId: string; deviceId: string }> }

export async function GET(_req: NextRequest, ctx: Ctx): Promise<Response> {
  return handleRoute(async () => {
    const { projectId, deviceId } = await ctx.params
    const session = await requireProjectAccess(projectId)
    const photos = await listDevicePhotos(session.companyId, projectId, deviceId)
    const data = photos.map((photo) => ({
      ...photo,
      url: `/api/projects/${projectId}/devices/${deviceId}/photos/${photo.id}`,
    }))
    return ok(data)
  })
}

export async function POST(req: NextRequest, ctx: Ctx): Promise<Response> {
  return handleRoute(async () => {
    const { projectId, deviceId } = await ctx.params
    const session = await requireProjectAccess(projectId)
    if (!canManageDevicePhotos(session.role)) {
      return forbidden("Insufficient permissions to upload device photos")
    }

    const body = await req.json()
    const input = completeDevicePhotoUploadSchema.parse(body)
    const photo = await createDevicePhoto(session.companyId, projectId, deviceId, session.userId, input)

    return created({
      ...photo,
      url: `/api/projects/${projectId}/devices/${deviceId}/photos/${photo.id}`,
    })
  })
}
