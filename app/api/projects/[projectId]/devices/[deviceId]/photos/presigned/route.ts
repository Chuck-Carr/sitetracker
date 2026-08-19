import type { NextRequest } from "next/server"
import { randomUUID } from "crypto"
import { requireProjectAccess } from "@/lib/auth/permissions"
import { handleRoute, ok, forbidden } from "@/lib/api/response"
import { createPresignedUploadUrl, devicePhotoStorageKey } from "@/lib/storage/presigned-urls"
import { presignedDevicePhotoSchema, canManageDevicePhotos } from "@/features/devices/schemas"

type Ctx = { params: Promise<{ projectId: string; deviceId: string }> }

export async function POST(req: NextRequest, ctx: Ctx): Promise<Response> {
  return handleRoute(async () => {
    const { projectId, deviceId } = await ctx.params
    const session = await requireProjectAccess(projectId)
    if (!canManageDevicePhotos(session.role)) {
      return forbidden("Insufficient permissions to upload device photos")
    }

    const body = await req.json()
    const { filename, contentType } = presignedDevicePhotoSchema.parse(body)

    const ext = filename.split(".").pop() ?? "jpg"
    const key = devicePhotoStorageKey(session.companyId, projectId, deviceId, `${randomUUID()}.${ext}`)

    const uploadUrl = await createPresignedUploadUrl({ key, contentType })

    return ok({ uploadUrl, storageKey: key })
  })
}
