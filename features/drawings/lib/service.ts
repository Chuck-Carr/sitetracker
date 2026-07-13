import "server-only"
import { prisma } from "@/lib/db/prisma"
import { tenantScope, projectScope } from "@/lib/db/tenancy"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getS3Client, S3_BUCKET } from "@/lib/storage/s3-client"
import { extractPDFMetadata, defaultSheetNumber } from "./pdf-parser"
import type { CompleteDrawingSetUploadInput } from "@/features/drawings/schemas"

// ─── Drawing Sets ─────────────────────────────────────────────────────────────

export async function listDrawingSets(companyId: string, projectId: string) {
  return prisma.drawingSet.findMany({
    where: { ...projectScope(companyId, projectId) },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { sheets: true } },
      uploadedBy: { select: { id: true, name: true } },
    },
  })
}

export type DrawingSetListItem = Awaited<ReturnType<typeof listDrawingSets>>[number]

export async function createDrawingSetFromUpload(
  companyId: string,
  projectId: string,
  userId: string,
  input: CompleteDrawingSetUploadInput,
): Promise<{ drawingSetId: string; sheetCount: number }> {
  // Fetch the uploaded PDF from S3 to extract page metadata
  const client = getS3Client()
  const s3Response = await client.send(
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: input.storageKey }),
  )

  const chunks: Uint8Array[] = []
  for await (const chunk of s3Response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk)
  }
  const pdfBuffer = Buffer.concat(chunks)

  const metadata = await extractPDFMetadata(pdfBuffer)

  // Create drawing set + all sheets in a single transaction
  const drawingSet = await prisma.$transaction(async (tx) => {
    const set = await tx.drawingSet.create({
      data: {
        companyId,
        projectId,
        name: input.name,
        storageKey: input.storageKey,
        originalFileName: input.originalFileName,
        fileSizeBytes: BigInt(input.fileSizeBytes),
        pageCount: metadata.pageCount,
        uploadedById: userId,
      },
    })

    await tx.drawingSheet.createMany({
      data: metadata.pages.map((page) => ({
        companyId,
        projectId,
        drawingSetId: set.id,
        sheetNumber: defaultSheetNumber(page.pageIndex),
        pageIndex: page.pageIndex,
        sortOrder: page.pageIndex,
        widthPoints: page.widthPoints,
        heightPoints: page.heightPoints,
        rotation: page.rotation,
      })),
    })

    return set
  })

  return { drawingSetId: drawingSet.id, sheetCount: metadata.pageCount }
}

// ─── Drawing Sheets ───────────────────────────────────────────────────────────

export async function listDrawingSheets(
  companyId: string,
  projectId: string,
  drawingSetId?: string,
) {
  return prisma.drawingSheet.findMany({
    where: {
      ...projectScope(companyId, projectId),
      ...(drawingSetId ? { drawingSetId } : {}),
    },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      drawingSetId: true,
      sheetNumber: true,
      sheetName: true,
      pageIndex: true,
      sortOrder: true,
      widthPoints: true,
      heightPoints: true,
      rotation: true,
      thumbnailStorageKey: true,
    },
  })
}

export type DrawingSheetListItem = Awaited<ReturnType<typeof listDrawingSheets>>[number]

export async function getDrawingSheet(companyId: string, projectId: string, sheetId: string) {
  return prisma.drawingSheet.findFirst({
    where: { id: sheetId, ...projectScope(companyId, projectId) },
    include: {
      drawingSet: { select: { id: true, name: true, storageKey: true } },
    },
  })
}

/**
 * Returns the drawing sheet plus the proxy URL for streaming the PDF.
 * Using the proxy avoids CORS issues on all devices and environments.
 */
export async function getDrawingSheetWithUrl(
  companyId: string,
  projectId: string,
  sheetId: string,
) {
  const sheet = await getDrawingSheet(companyId, projectId, sheetId)
  if (!sheet) return null

  // Proxy URL — same-origin, no CORS, auth-gated, streams directly from S3
  const pdfUrl = `/api/projects/${projectId}/drawing-sheets/${sheetId}/pdf`

  return { sheet, pdfUrl }
}
