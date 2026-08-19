"use client"

import { useRef, useState } from "react"
import { Camera, AlertCircle, Loader2 } from "lucide-react"
import {
  useDevicePhotos,
  useUploadDevicePhoto,
  useDeleteDevicePhoto,
  type DevicePhoto,
} from "@/features/devices/hooks/use-device-photos"
import { DevicePhotoLightbox } from "@/features/devices/components/DevicePhotoLightbox"
import { cn } from "@/lib/utils/cn"

interface Props {
  projectId: string
  deviceId: string
  canManage: boolean
}

export function DevicePhotoGallery({ projectId, deviceId, canManage }: Props) {
  const { data: photos = [], isLoading } = useDevicePhotos(projectId, deviceId)
  const upload = useUploadDevicePhoto(projectId, deviceId)
  const deletePhoto = useDeleteDevicePhoto(projectId, deviceId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [uploadCount, setUploadCount] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    const files = Array.from(fileList)
    setUploadError(null)
    setUploadCount((n) => n + files.length)

    for (const file of files) {
      upload.mutate(
        { file },
        {
          onError: (err) => setUploadError(err instanceof Error ? err.message : "Upload failed"),
          onSettled: () => setUploadCount((n) => Math.max(0, n - 1)),
        },
      )
    }

    // Allow re-selecting the same file(s) again later
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function handleDelete(photoId: string) {
    deletePhoto.mutate(photoId)
    setLightboxIndex(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Photos {photos.length > 0 && `(${photos.length})`}
        </p>
        {canManage && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadCount > 0}
            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-60"
          >
            {uploadCount > 0 ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
            {uploadCount > 0 ? `Uploading ${uploadCount}…` : "Add Photo"}
          </button>
        )}
      </div>

      {canManage && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => handleFilesSelected(e.target.files)}
        />
      )}

      {uploadError && (
        <p className="mb-2 text-xs text-red-600 flex items-center gap-1">
          <AlertCircle size={12} /> {uploadError}
        </p>
      )}

      {isLoading ? (
        <p className="text-xs text-slate-400">Loading photos…</p>
      ) : photos.length === 0 && uploadCount === 0 ? (
        <p className="text-xs text-slate-400">No photos yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              onClick={() => setLightboxIndex(i)}
              className={cn(
                "relative aspect-square rounded-md overflow-hidden border border-slate-200",
                "bg-slate-100 hover:opacity-90 transition-opacity",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.originalFileName}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
          {Array.from({ length: uploadCount }).map((_, i) => (
            <div
              key={`pending-${i}`}
              className="aspect-square rounded-md border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center"
            >
              <Loader2 size={16} className="animate-spin text-slate-400" />
            </div>
          ))}
        </div>
      )}

      {lightboxIndex !== null && photos[lightboxIndex] && (
        <DevicePhotoLightbox
          photos={photos as DevicePhoto[]}
          index={lightboxIndex}
          canManage={canManage}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onDelete={handleDelete}
          isDeleting={deletePhoto.isPending}
        />
      )}
    </div>
  )
}
