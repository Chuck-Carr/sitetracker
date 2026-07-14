"use client"

import { useState } from "react"
import { X, Pencil, Trash2, AlertCircle } from "lucide-react"
import type { DeviceStatus } from "@/app/generated/prisma/client"
import type { DeviceListItem } from "@/features/devices/lib/service"
import { DeviceStageStepper } from "./DeviceStageStepper"
import { useUpdateDeviceStatus, useDeleteDevice } from "@/features/devices/hooks/use-sheet-devices"
import { cn } from "@/lib/utils/cn"

const STATUS_LABELS: Record<DeviceStatus, string> = {
  NOT_STARTED: "Not Started",
  ROUGH_IN:    "Rough In",
  INSTALLED:   "Installed",
  PROGRAMMED:  "Programmed",
  TESTED:      "Tested",
  NEEDS_INFO:  "Needs Info",
}

const ALL_STATUSES = Object.keys(STATUS_LABELS) as DeviceStatus[]

interface Props {
  device: DeviceListItem
  projectId: string
  sheetId: string
  isAdmin: boolean
  onClose: () => void
  onEditRequest: () => void   // admin only: open AddEditDevicePanel in edit mode
}

export function DeviceDetailPanel({ device, projectId, sheetId, isAdmin, onClose, onEditRequest }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const updateStatus = useUpdateDeviceStatus(projectId, sheetId)
  const deleteDevice = useDeleteDevice(projectId, sheetId)

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const status = e.target.value as DeviceStatus
    // On mobile/tablet (below the lg breakpoint) close the panel automatically
    // after a successful update so the drawing is visible again.
    const isMobileOrTablet = window.matchMedia("(max-width: 1279px)").matches
    updateStatus.mutate(
      { deviceId: device.id, status },
      { onSuccess: () => { if (isMobileOrTablet) onClose() } },
    )
  }

  function handleDelete() {
    deleteDevice.mutate(device.id, { onSuccess: onClose })
  }

  const isViewer = !isAdmin && true // future-proof: VIEWER role would have no dropdown

  return (
    <div className="absolute top-0 right-0 bottom-0 w-72 bg-white border-l border-slate-200 shadow-xl z-20 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide truncate">
            {device.deviceType.name}
          </p>
          <p className="text-sm font-bold text-slate-900 truncate">
            {device.deviceIdentifier ?? device.deviceType.code}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {isAdmin && (
            <button
              onClick={onEditRequest}
              title="Edit device"
              className="flex items-center justify-center h-8 w-8 rounded-md text-slate-500 hover:bg-slate-100"
            >
              <Pencil size={15} />
            </button>
          )}
          <button
            onClick={onClose}
            title="Close"
            className="flex items-center justify-center h-8 w-8 rounded-md text-slate-500 hover:bg-slate-100"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Stage stepper */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Progress</p>
          <DeviceStageStepper status={device.status} />
        </div>

        {/* Status dropdown — tech + admin can change */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Update Status
          </label>
          <select
            value={device.status}
            onChange={handleStatusChange}
            disabled={updateStatus.isPending}
            className={cn(
              "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
              "disabled:opacity-60",
            )}
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          {updateStatus.isError && (
            <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
              <AlertCircle size={12} /> Failed to update status
            </p>
          )}
        </div>

        {/* Device metadata */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Details</p>
          {[
            { label: "Type", value: `${device.deviceType.name} (${device.deviceType.code})` },
            { label: "Identifier", value: device.deviceIdentifier },
            { label: "Floor", value: device.floor },
            { label: "Room", value: device.room },
            { label: "Loop", value: device.loop },
            { label: "Description", value: device.description },
          ].map(({ label, value }) =>
            value ? (
              <div key={label}>
                <p className="text-xs text-slate-400">{label}</p>
                <p className="text-sm text-slate-800 font-medium">{value}</p>
              </div>
            ) : null,
          )}
        </div>
      </div>

      {/* Admin delete zone */}
      {isAdmin && (
        <div className="shrink-0 border-t border-slate-200 p-4">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium"
            >
              <Trash2 size={15} /> Delete device
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-600">Remove this device from the drawing?</p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleteDevice.isPending}
                  className="flex-1 rounded-md bg-red-600 text-white text-sm py-1.5 font-medium hover:bg-red-700 disabled:opacity-60"
                >
                  {deleteDevice.isPending ? "Removing…" : "Yes, delete"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-md border border-slate-300 text-slate-700 text-sm py-1.5 font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
