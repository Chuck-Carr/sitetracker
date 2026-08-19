"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { resizeImageFile } from "@/lib/utils/image-resize"

export interface DevicePhoto {
  id: string
  originalFileName: string
  fileSizeBytes: string
  mimeType: string
  createdAt: string
  uploadedBy: { id: string; name: string }
  url: string
}

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string }

function photoKey(projectId: string, deviceId: string) {
  return ["devices", projectId, deviceId, "photos"] as const
}

async function fetchDevicePhotos(projectId: string, deviceId: string): Promise<DevicePhoto[]> {
  const res = await fetch(`/api/projects/${projectId}/devices/${deviceId}/photos`)
  const json: ApiResponse<DevicePhoto[]> = await res.json()
  if (!json.success) throw new Error(json.error)
  return json.data
}

export function useDevicePhotos(projectId: string, deviceId: string) {
  return useQuery({
    queryKey: photoKey(projectId, deviceId),
    queryFn: () => fetchDevicePhotos(projectId, deviceId),
    enabled: !!projectId && !!deviceId,
  })
}

// ─── Upload ─────────────────────────────────────────────────────────────────

interface UploadDevicePhotoInput {
  file: File
  onProgress?: (pct: number) => void
}

async function uploadDevicePhoto(
  projectId: string,
  deviceId: string,
  { file, onProgress }: UploadDevicePhotoInput,
): Promise<DevicePhoto> {
  const resized = await resizeImageFile(file)

  // 1. Get presigned URL
  const presignRes = await fetch(`/api/projects/${projectId}/devices/${deviceId}/photos/presigned`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: resized.name, contentType: resized.type }),
  })
  const presignJson: ApiResponse<{ uploadUrl: string; storageKey: string }> = await presignRes.json()
  if (!presignJson.success) throw new Error(presignJson.error)
  const { uploadUrl, storageKey } = presignJson.data

  // 2. Upload directly to S3
  await uploadToS3({ url: uploadUrl, file: resized, onProgress })

  // 3. Complete — creates the DevicePhoto record
  const completeRes = await fetch(`/api/projects/${projectId}/devices/${deviceId}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storageKey,
      originalFileName: file.name,
      fileSizeBytes: resized.size,
      mimeType: resized.type,
    }),
  })
  const completeJson: ApiResponse<DevicePhoto> = await completeRes.json()
  if (!completeJson.success) throw new Error(completeJson.error)
  return completeJson.data
}

function uploadToS3({
  url,
  file,
  onProgress,
}: {
  url: string
  file: File
  onProgress?: (pct: number) => void
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", url)
    xhr.setRequestHeader("Content-Type", file.type)

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

export function useUploadDevicePhoto(projectId: string, deviceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UploadDevicePhotoInput) => uploadDevicePhoto(projectId, deviceId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: photoKey(projectId, deviceId) })
    },
  })
}

// ─── Delete ─────────────────────────────────────────────────────────────────

export function useDeleteDevicePhoto(projectId: string, deviceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (photoId: string) => {
      const res = await fetch(`/api/projects/${projectId}/devices/${deviceId}/photos/${photoId}`, {
        method: "DELETE",
      })
      if (!res.ok && res.status !== 204) {
        const json = await res.json()
        throw new Error(json.error ?? "Delete failed")
      }
    },
    onMutate: async (photoId) => {
      await qc.cancelQueries({ queryKey: photoKey(projectId, deviceId) })
      const previous = qc.getQueryData<DevicePhoto[]>(photoKey(projectId, deviceId))
      qc.setQueryData<DevicePhoto[]>(photoKey(projectId, deviceId), (old) =>
        old?.filter((p) => p.id !== photoId) ?? [],
      )
      return { previous }
    },
    onError: (_err, _photoId, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(photoKey(projectId, deviceId), ctx.previous)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: photoKey(projectId, deviceId) })
    },
  })
}
