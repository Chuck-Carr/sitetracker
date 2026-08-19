"use client"

import { useState, useEffect } from "react"
import { X, ChevronLeft, ChevronRight, Trash2 } from "lucide-react"
import type { DevicePhoto } from "@/features/devices/hooks/use-device-photos"

interface Props {
  photos: DevicePhoto[]
  index: number
  canManage: boolean
  onIndexChange: (index: number) => void
  onClose: () => void
  onDelete: (photoId: string) => void
  isDeleting: boolean
}

export function DevicePhotoLightbox({
  photos,
  index,
  canManage,
  onIndexChange,
  onClose,
  onDelete,
  isDeleting,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const photo = photos[index]

  // Dismiss the delete confirmation whenever the viewed photo changes,
  // without needing a setState-in-effect (which triggers cascading renders).
  function goTo(newIndex: number) {
    setConfirmDelete(false)
    onIndexChange(newIndex)
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft" && index > 0) goTo(index - 1)
      if (e.key === "ArrowRight" && index < photos.length - 1) goTo(index + 1)
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, photos.length, onClose])

  if (!photo) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 text-white shrink-0">
        <p className="text-sm truncate">{photo.originalFileName}</p>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {canManage && !confirmDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              title="Delete photo"
              className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-white/10"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            title="Close"
            className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Confirm delete bar */}
      {confirmDelete && (
        <div className="flex items-center justify-center gap-3 bg-red-600/90 text-white text-sm py-2">
          <span>Delete this photo?</span>
          <button
            onClick={() => onDelete(photo.id)}
            disabled={isDeleting}
            className="rounded-md bg-white/20 px-3 py-1 font-medium hover:bg-white/30 disabled:opacity-60"
          >
            {isDeleting ? "Deleting…" : "Yes, delete"}
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="rounded-md px-3 py-1 font-medium hover:bg-white/10"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Image + nav */}
      <div className="flex-1 relative flex items-center justify-center min-h-0 px-4">
        {index > 0 && (
          <button
            onClick={() => goTo(index - 1)}
            className="absolute left-2 md:left-6 flex items-center justify-center h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={photo.originalFileName}
          className="max-h-full max-w-full object-contain"
        />

        {index < photos.length - 1 && (
          <button
            onClick={() => goTo(index + 1)}
            className="absolute right-2 md:right-6 flex items-center justify-center h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {/* Footer — position indicator */}
      {photos.length > 1 && (
        <div className="text-center text-xs text-white/60 py-3 shrink-0">
          {index + 1} / {photos.length}
        </div>
      )}
    </div>
  )
}
