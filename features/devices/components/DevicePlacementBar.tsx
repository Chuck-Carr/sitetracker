"use client"

import { Check, RectangleHorizontal } from "lucide-react"
import { useViewerStore } from "@/features/drawings/hooks/use-viewer-store"
import { useDeviceTypes } from "@/features/devices/hooks/use-device-types"
import { cn } from "@/lib/utils/cn"

interface Props {
  projectId: string
  /** Number of devices placed during the current rapid-placement session. */
  placedCount: number
}

/**
 * Floating control shown while the admin is in the "draw-region" tool.
 *
 * The admin picks a device type once; every box they then draw instantly
 * becomes a device of that type (see DrawingViewerClient). Switching the type
 * is a single click and drawing continues until "Done" is pressed.
 */
export function DevicePlacementBar({ projectId, placedCount }: Props) {
  const { data: deviceTypes = [], isLoading } = useDeviceTypes(projectId)
  const { rapidTypeId, setRapidType, setActiveTool } = useViewerStore()

  const activeType = deviceTypes.find((t) => t.id === rapidTypeId) ?? null

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xl">
      <div className="flex items-center gap-1.5 text-emerald-700 shrink-0">
        <RectangleHorizontal size={16} />
        <span className="text-xs font-semibold uppercase tracking-wide">Add Device</span>
      </div>

      <div className="h-6 w-px bg-slate-200" />

      {isLoading ? (
        <span className="text-sm text-slate-400">Loading types…</span>
      ) : (
        <select
          value={rapidTypeId ?? ""}
          onChange={(e) => setRapidType(e.target.value || null)}
          className={cn(
            "rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
          )}
        >
          <option value="">Select a device type…</option>
          {deviceTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.code} — {t.name}
            </option>
          ))}
        </select>
      )}

      <span className="text-xs text-slate-500 max-w-[15rem] hidden sm:block">
        {activeType
          ? `Draw boxes to add ${activeType.code}. Pick another type to switch.`
          : "Choose a type, then draw boxes to place devices."}
        {placedCount > 0 && (
          <span className="ml-1 font-semibold text-slate-700">
            {placedCount} added
          </span>
        )}
      </span>

      <button
        onClick={() => setActiveTool("select")}
        className="flex items-center gap-1 rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-900 transition-colors shrink-0"
      >
        <Check size={14} /> Done
      </button>
    </div>
  )
}
