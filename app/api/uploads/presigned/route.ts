import { requireProjectAccess } from "@/lib/auth/permissions"
import { handleRoute, ok, badRequest } from "@/lib/api/response"
import { createPresignedUploadUrl, drawingStorageKey } from "@/lib/storage/presigned-urls"
import { createPresignedUploadSchema } from "@/features/drawings/schemas"
import { randomUUID } from "crypto"

export async function POST(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const body = await request.json()
    const { filename, contentType, projectId } = createPresignedUploadSchema.parse(body)

    if (contentType !== "application/pdf") {
      return badRequest("Only PDF files are supported")
    }

    const session = await requireProjectAccess(projectId, "MANAGER")

    // Build a unique, structured storage key
    const ext = filename.split(".").pop() ?? "pdf"
    const key = drawingStorageKey(session.companyId, projectId, `${randomUUID()}.${ext}`)

    const uploadUrl = await createPresignedUploadUrl({ key, contentType })

    return ok({ uploadUrl, storageKey: key })
  })
}
