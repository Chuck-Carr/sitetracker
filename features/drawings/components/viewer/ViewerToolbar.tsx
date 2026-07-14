"use client"

import { ZoomIn, ZoomOut, Maximize2, MousePointer2, Hand, RectangleHorizontal } from "lucide-react"
import { useViewerStore } from "@/features/drawings/hooks/use-viewer-store"
import { cn } from "@/lib/utils/cn"
import type { UserRole } from "@/app/generated/prisma/client"
import { isAdmin } from "@/features/devices/schemas"

interface ViewerToolbarProps {
  fitZoom: number | null
  userRole: UserRole
}

export function ViewerToolbar({ fitZoom, userRole }: ViewerToolbarProps) {
  const { zoom, zoomIn, zoomOut, resetView, activeTool, setActiveTool } = useViewerStore()

  const baseTool = [
    { id: "select" as const, icon: MousePointer2, label: "Select" },
    { id: "pan" as const, icon: Hand, label: "Pan" },
  ]

  const adminTools = isAdmin(userRole)
    ? [{ id: "draw-region" as const, icon: RectangleHorizontal, label: "Add Device" }]
    : []

  const tools = [...baseTool, ...adminTools]

  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white shadow-sm px-2 py-1.5">
      {/* Tool buttons */}
      <div className="flex items-center gap-0.5 pr-2 border-r border-slate-200 mr-1">
        {tools.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            title={label}
            onClick={() => setActiveTool(id)}
            className={cn(
              "flex items-center justify-center h-8 w-8 rounded-md transition-colors",
              activeTool === id
                ? "bg-blue-100 text-blue-600"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
              id === "draw-region" && activeTool !== "draw-region" && "hover:bg-emerald-50 hover:text-emerald-700",
            )}
          >
            <Icon size={16} />
          </button>
        ))}
      </div>

      {/* Zoom controls */}
      <button
        title="Zoom out"
        onClick={zoomOut}
        className="flex items-center justify-center h-8 w-8 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
      >
        <ZoomOut size={16} />
      </button>

      <span className="text-xs font-mono text-slate-600 w-12 text-center">
        {Math.round(zoom * 100)}%
      </span>

      <button
        title="Zoom in"
        onClick={zoomIn}
        className="flex items-center justify-center h-8 w-8 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
      >
        <ZoomIn size={16} />
      </button>

      <button
        title="Reset to fit"
      onClick={() => resetView(fitZoom ?? 1)}
        className="flex items-center justify-center h-8 w-8 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
      >
        <Maximize2 size={15} />
      </button>
    </div>
  )
}
