import type { NextRequest } from "next/server"
import { requireProjectAccess } from "@/lib/auth/permissions"
import { handleRoute, notFound, serverError } from "@/lib/api/response"
import { getDrawingSheet } from "@/features/drawings/lib/service"
import { getS3Client, S3_BUCKET } from "@/lib/storage/s3-client"
import { GetObjectCommand } from "@aws-sdk/client-s3"

/**
 * Streams the PDF for a drawing sheet directly from S3 to the browser.
 *
 * Using a proxy instead of presigned URLs solves two problems:
 * 1. CORS — presigned S3 URLs require CORS headers on the bucket, which is
 *    fragile across environments. This endpoint is same-origin and always works.
 * 2. Auth — the PDF is only accessible to authenticated, authorized users.
 *
 * Response is streamed (not buffered) so large PDFs don't exhaust server memory.
 */
export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/projects/[projectId]/drawing-sheets/[sheetId]/pdf">,
): Promise<Response> {
  return handleRoute(async () => {
    const { projectId, sheetId } = await ctx.params
    const session = await requireProjectAccess(projectId)

    const sheet = await getDrawingSheet(session.companyId, projectId, sheetId)
    if (!sheet) return notFound()

    const client = getS3Client()
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: sheet.drawingSet.storageKey,
    })

    let s3Response
    try {
      s3Response = await client.send(command)
    } catch {
      return serverError("Failed to retrieve drawing from storage")
    }

    if (!s3Response.Body) return serverError("Empty response from storage")

    // Stream the S3 body directly to the client — no buffering
    const stream = s3Response.Body.transformToWebStream()

    return new Response(stream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": s3Response.ContentLength?.toString() ?? "",
        // Allow PDF.js to cache the file in the browser for this session
        "Cache-Control": "private, max-age=900",
        "Content-Disposition": `inline; filename="${encodeURIComponent(sheet.drawingSet.name)}.pdf"`,
      },
    })
  })
}
