"use client"

import { useState, useEffect } from "react"
import { X, AlertCircle } from "lucide-react"
import type { DeviceListItem } from "@/features/devices/lib/service"
import type { NormalizedRect } from "@/features/drawings/hooks/use-viewer-store"
import { useDeviceTypes } from "@/features/devices/hooks/use-device-types"
import { useCreateDevice, useAdminUpdateDevice } from "@/features/devices/hooks/use-sheet-devices"
import { cn } from "@/lib/utils/cn"

interface Props {
  projectId: string
  sheetId: string
  /** Present when creating a new device from a drawn rect */
  pendingRect?: NormalizedRect | null
  /** Present when editing an existing device */
  editDevice?: DeviceListItem | null
  onClose: () => void
}

export function AddEditDevicePanel({ projectId, sheetId, pendingRect, editDevice, onClose }: Props) {
  const isEdit = !!editDevice
  const { data: deviceTypes = [], isLoading: typesLoading } = useDeviceTypes(projectId)

  const createDevice = useCreateDevice(projectId, sheetId)
  const updateDevice = useAdminUpdateDevice(projectId, sheetId)

  const [deviceTypeId, setDeviceTypeId] = useState(editDevice?.deviceTypeId ?? "")
  const [identifier, setIdentifier] = useState(editDevice?.deviceIdentifier ?? "")
  const [floor, setFloor] = useState(editDevice?.floor ?? "")
  const [room, setRoom] = useState(editDevice?.room ?? "")
  const [loop, setLoop] = useState(editDevice?.loop ?? "")
  const [description, setDescription] = useState(editDevice?.description ?? "")
  const [error, setError] = useState<string | null>(null)

  // Prefill device type when types load if editing
  useEffect(() => {
    if (isEdit && editDevice && !deviceTypeId) {
      setDeviceTypeId(editDevice.deviceTypeId)
    }
  }, [isEdit, editDevice, deviceTypeId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!deviceTypeId) {
      setError("Device type is required")
      return
    }

    if (isEdit && editDevice) {
      updateDevice.mutate(
        {
          deviceId: editDevice.id,
          deviceTypeId,
          deviceIdentifier: identifier || undefined,
          floor: floor || undefined,
          room: room || undefined,
          loop: loop || undefined,
          description: description || undefined,
        },
        { onSuccess: onClose, onError: (err) => setError(err.message) },
      )
    } else {
      if (!pendingRect) {
        setError("No region selected — draw a rectangle on the drawing first")
        return
      }
      createDevice.mutate(
        {
          deviceTypeId,
          normalizedX: pendingRect.x,
          normalizedY: pendingRect.y,
          normalizedWidth: pendingRect.w,
          normalizedHeight: pendingRect.h,
          deviceIdentifier: identifier || undefined,
          floor: floor || undefined,
          room: room || undefined,
          loop: loop || undefined,
          description: description || undefined,
        },
        { onSuccess: onClose, onError: (err) => setError(err.message) },
      )
    }
  }

  const isPending = createDevice.isPending || updateDevice.isPending

  return (
    <div className="absolute top-0 right-0 bottom-0 w-72 bg-white border-l border-slate-200 shadow-xl z-20 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0">
        <p className="text-sm font-bold text-slate-900">
          {isEdit ? "Edit Device" : "Add Device"}
        </p>
        <button
          onClick={onClose}
          className="flex items-center justify-center h-8 w-8 rounded-md text-slate-500 hover:bg-slate-100"
        >
          <X size={16} />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Device type */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Device Type <span className="text-red-500">*</span>
          </label>
          {typesLoading ? (
            <p className="text-sm text-slate-400">Loading types…</p>
          ) : (
            <select
              value={deviceTypeId}
              onChange={(e) => setDeviceTypeId(e.target.value)}
              required
              className={cn(
                "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
              )}
            >
              <option value="">Select type…</option>
              {deviceTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code} — {t.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Optional fields */}
        {[
          { label: "Identifier / Tag", value: identifier, onChange: setIdentifier, placeholder: "e.g. SD-101" },
          { label: "Floor", value: floor, onChange: setFloor, placeholder: "e.g. 2" },
          { label: "Room", value: room, onChange: setRoom, placeholder: "e.g. Office 201" },
          { label: "Loop", value: loop, onChange: setLoop, placeholder: "e.g. L-1" },
        ].map(({ label, value, onChange, placeholder }) => (
          <div key={label}>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              {label}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className={cn(
                "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
              )}
            />
          </div>
        ))}

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Optional notes…"
            className={cn(
              "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 resize-none",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
            )}
          />
        </div>

        {error && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle size={12} /> {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending || typesLoading}
          className={cn(
            "w-full rounded-md bg-blue-600 text-white text-sm font-medium py-2.5",
            "hover:bg-blue-700 disabled:opacity-60 transition-colors",
          )}
        >
          {isPending ? (isEdit ? "Saving…" : "Adding…") : (isEdit ? "Save Changes" : "Add Device")}
        </button>
      </form>
    </div>
  )
}
