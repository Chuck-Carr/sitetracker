import type { NextRequest } from "next/server"
import { GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { requireProjectAccess } from "@/lib/auth/permissions"
import { handleRoute, noContent, notFound, forbidden, serverError } from "@/lib/api/response"
import { getDevicePhoto, deleteDevicePhoto } from "@/features/devices/lib/service"
import { canManageDevicePhotos } from "@/features/devices/schemas"
import { getS3Client, S3_BUCKET } from "@/lib/storage/s3-client"

type Ctx = { params: Promise<{ projectId: string; deviceId: string; photoId: string }> }

/**
 * Streams a device photo directly from S3 to the browser.
 * Same-origin proxy — no CORS, auth-gated — mirrors the drawing PDF route.
 */
export async function GET(_req: NextRequest, ctx: Ctx): Promise<Response> {
  return handleRoute(async () => {
    const { projectId, deviceId, photoId } = await ctx.params
    const session = await requireProjectAccess(projectId)

    const photo = await getDevicePhoto(session.companyId, projectId, deviceId, photoId)
    if (!photo) return notFound()

    const client = getS3Client()
    let s3Response
    try {
      s3Response = await client.send(
        new GetObjectCommand({ Bucket: S3_BUCKET, Key: photo.storageKey }),
      )
    } catch {
      return serverError("Failed to retrieve photo from storage")
    }

    if (!s3Response.Body) return serverError("Empty response from storage")

    const stream = s3Response.Body.transformToWebStream()

    return new Response(stream, {
      headers: {
        "Content-Type": photo.mimeType,
        "Content-Length": s3Response.ContentLength?.toString() ?? "",
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": `inline; filename="${encodeURIComponent(photo.originalFileName)}"`,
      },
    })
  })
}

export async function DELETE(_req: NextRequest, ctx: Ctx): Promise<Response> {
  return handleRoute(async () => {
    const { projectId, deviceId, photoId } = await ctx.params
    const session = await requireProjectAccess(projectId)
    if (!canManageDevicePhotos(session.role)) {
      return forbidden("Insufficient permissions to delete device photos")
    }

    const photo = await getDevicePhoto(session.companyId, projectId, deviceId, photoId)
    if (!photo) return notFound()

    await deleteDevicePhoto(session.companyId, projectId, deviceId, photoId)

    // Best-effort S3 cleanup — never block the response on storage errors.
    try {
      const client = getS3Client()
      await client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: photo.storageKey }))
    } catch (error) {
      console.error("[DevicePhoto] Failed to delete S3 object", error)
    }

    return noContent()
  })
}
