"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, FileText, ChevronRight, Layers } from "lucide-react"
import { useDrawingSets, useDrawingSheets } from "@/features/drawings/hooks/use-drawings"
import { DrawingUploader } from "./drawing-uploader"
import { Button } from "@/components/ui/button"
import type { DrawingSetListItem } from "@/features/drawings/lib/service"

interface DrawingsClientProps {
  projectId: string
  initialDrawingSets: DrawingSetListItem[]
  canUpload?: boolean
}

export function DrawingsClient({ projectId, initialDrawingSets, canUpload = false }: DrawingsClientProps) {
  const [showUploader, setShowUploader] = useState(false)
  const { data: drawingSets = initialDrawingSets } = useDrawingSets(projectId)

  return (
    <div className="space-y-4">
      {canUpload && (
        showUploader ? (
          <DrawingUploader
            projectId={projectId}
            onSuccess={() => setShowUploader(false)}
            onCancel={() => setShowUploader(false)}
          />
        ) : (
          <Button onClick={() => setShowUploader(true)} size="sm">
            <Plus size={16} />
            Upload drawing set
          </Button>
        )
      )}

      {drawingSets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
          <Layers className="mx-auto mb-3 text-slate-300" size={40} />
          <p className="text-sm font-medium text-slate-600">No drawing sets yet</p>
          <p className="mt-1 text-xs text-slate-400">Upload a PDF to get started</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {drawingSets.map((set) => (
            <div key={set.id} className="px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="text-slate-400 shrink-0" size={18} />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{set.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {set._count.sheets} sheet{set._count.sheets !== 1 ? "s" : ""} · Uploaded by {set.uploadedBy.name}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/projects/${projectId}/drawings?setId=${set.id}`}
                  className="ml-4 shrink-0 text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  View sheets
                  <ChevronRight size={14} />
                </Link>
              </div>

              {/* Sheet list inline */}
              <SheetList projectId={projectId} drawingSetId={set.id} sheetCount={set._count.sheets} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SheetList({
  projectId,
  drawingSetId,
  sheetCount,
}: {
  projectId: string
  drawingSetId: string
  sheetCount: number
}) {
  const [expanded, setExpanded] = useState(sheetCount <= 10)

  // Dynamically import sheets when expanded
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="mt-2 ml-9 text-xs text-blue-600 hover:text-blue-700"
      >
        Show {sheetCount} sheet{sheetCount !== 1 ? "s" : ""}
      </button>
    )
  }

  return <SheetListExpanded projectId={projectId} drawingSetId={drawingSetId} />
}

function SheetListExpanded({
  projectId,
  drawingSetId,
}: {
  projectId: string
  drawingSetId: string
}) {
  const { data: sheets = [], isLoading } = useDrawingSheets(projectId, drawingSetId)

  if (isLoading) {
    return <div className="mt-2 ml-9 text-xs text-slate-400">Loading sheets…</div>
  }

  return (
    <div className="mt-2 ml-9 space-y-1">
      {sheets.map((sheet: { id: string; sheetNumber: string; sheetName?: string | null }) => (
        <Link
          key={sheet.id}
          href={`/projects/${projectId}/drawings/${sheet.id}`}
          className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-slate-50 transition-colors text-slate-700 hover:text-slate-900"
        >
          <span className="font-mono text-slate-400 w-6 text-right">{sheet.sheetNumber}</span>
          <span>{sheet.sheetName ?? `Sheet ${sheet.sheetNumber}`}</span>
          <ChevronRight size={12} className="ml-auto text-slate-300" />
        </Link>
      ))}
    </div>
  )
}
