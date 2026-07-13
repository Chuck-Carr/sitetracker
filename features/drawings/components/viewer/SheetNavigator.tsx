"use client"

import Link from "next/link"
import { useDrawingSheets } from "@/features/drawings/hooks/use-drawings"
import { cn } from "@/lib/utils/cn"

interface SheetNavigatorProps {
  projectId: string
  drawingSetId: string
  activeSheetId: string
  onSheetSelect?: () => void
}

export function SheetNavigator({ projectId, drawingSetId, activeSheetId, onSheetSelect }: SheetNavigatorProps) {
  const { data: sheets = [], isLoading } = useDrawingSheets(projectId, drawingSetId)

  return (
    <div className="flex flex-col h-full bg-slate-800 text-slate-100 w-52 shrink-0">
      <div className="px-4 py-3 border-b border-slate-700">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Sheets</p>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {isLoading ? (
          <div className="px-4 py-3 text-xs text-slate-400">Loading…</div>
        ) : (
          sheets.map((sheet) => (
              <Link
              key={sheet.id}
              href={`/projects/${projectId}/drawings/${sheet.id}`}
              onClick={onSheetSelect}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm transition-colors",
                sheet.id === activeSheetId
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white",
              )}
            >
              <span className="font-mono text-xs w-5 text-right shrink-0">
                {sheet.sheetNumber}
              </span>
              <span className="truncate text-xs">
                {sheet.sheetName ?? `Sheet ${sheet.sheetNumber}`}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
