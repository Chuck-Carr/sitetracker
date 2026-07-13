import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { DrawingSetListItem, DrawingSheetListItem } from "@/features/drawings/lib/service"

// ─── Keys ─────────────────────────────────────────────────────────────────────

export const drawingKeys = {
  sets: (projectId: string) => ["projects", projectId, "drawing-sets"] as const,
  sheets: (projectId: string, drawingSetId?: string) =>
    ["projects", projectId, "drawing-sheets", drawingSetId] as const,
  sheet: (projectId: string, sheetId: string) =>
    ["projects", projectId, "drawing-sheets", sheetId, "detail"] as const,
}

// ─── Drawing Sets ──────────────────────────────────────────────────────────────

async function fetchDrawingSets(projectId: string): Promise<DrawingSetListItem[]> {
  const res = await fetch(`/api/projects/${projectId}/drawing-sets`)
  if (!res.ok) throw new Error("Failed to fetch drawing sets")
  return (await res.json()).data
}

export function useDrawingSets(projectId: string) {
  return useQuery({
    queryKey: drawingKeys.sets(projectId),
    queryFn: () => fetchDrawingSets(projectId),
    enabled: !!projectId,
  })
}

// ─── Upload flow ──────────────────────────────────────────────────────────────

interface UploadDrawingInput {
  projectId: string
  file: File
  name: string
  onProgress?: (pct: number) => void
}

async function uploadDrawing({ projectId, file, name, onProgress }: UploadDrawingInput) {
  // 1. Get presigned URL
  const presignRes = await fetch("/api/uploads/presigned", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/pdf",
      projectId,
    }),
  })
  if (!presignRes.ok) throw new Error("Failed to get upload URL")
  const { data: { uploadUrl, storageKey } } = await presignRes.json()

  // 2. Upload directly to S3 (no app server in the path)
  await uploadToS3({ url: uploadUrl, file, onProgress })

  // 3. Complete — triggers server-side PDF parsing + record creation
  const completeRes = await fetch(`/api/projects/${projectId}/drawing-sets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storageKey,
      name,
      originalFileName: file.name,
      fileSizeBytes: file.size,
    }),
  })
  if (!completeRes.ok) throw new Error("Failed to complete drawing set upload")
  return (await completeRes.json()).data
}

async function uploadToS3({
  url,
  file,
  onProgress,
}: {
  url: string
  file: File
  onProgress?: (pct: number) => void
}) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", url)
    xhr.setRequestHeader("Content-Type", file.type || "application/pdf")

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`S3 upload failed: ${xhr.status}`))
    }

    xhr.onerror = () => reject(new Error("S3 upload network error"))
    xhr.send(file)
  })
}

export function useUploadDrawing(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: uploadDrawing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.sets(projectId) })
    },
  })
}

// ─── Drawing Sheets ───────────────────────────────────────────────────────────

async function fetchDrawingSheets(
  projectId: string,
  drawingSetId?: string,
): Promise<DrawingSheetListItem[]> {
  const url = drawingSetId
    ? `/api/projects/${projectId}/drawing-sheets?drawingSetId=${drawingSetId}`
    : `/api/projects/${projectId}/drawing-sheets`
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch drawing sheets")
  return (await res.json()).data
}

export function useDrawingSheets(projectId: string, drawingSetId?: string) {
  return useQuery({
    queryKey: drawingKeys.sheets(projectId, drawingSetId),
    queryFn: () => fetchDrawingSheets(projectId, drawingSetId),
    enabled: !!projectId,
  })
}

// ─── Sheet with presigned URL ─────────────────────────────────────────────────

async function fetchDrawingSheetWithUrl(projectId: string, sheetId: string) {
  const res = await fetch(`/api/projects/${projectId}/drawing-sheets/${sheetId}`)
  if (!res.ok) throw new Error("Failed to fetch drawing sheet")
  return (await res.json()).data as { sheet: DrawingSheetListItem; pdfUrl: string }
}

export function useDrawingSheetWithUrl(projectId: string, sheetId: string) {
  return useQuery({
    queryKey: drawingKeys.sheet(projectId, sheetId),
    queryFn: () => fetchDrawingSheetWithUrl(projectId, sheetId),
    enabled: !!projectId && !!sheetId,
    // Proxy URL is permanent — no need to refresh
    staleTime: Infinity,
  })
}
