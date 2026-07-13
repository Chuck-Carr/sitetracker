"use client"

import { useState } from "react"
import { Layers, X } from "lucide-react"
import { DrawingViewport } from "./DrawingViewport"
import { SheetNavigator } from "./SheetNavigator"
import type { DrawingSheetListItem } from "@/features/drawings/lib/service"

interface DrawingViewerClientProps {
  projectId: string
  sheet: DrawingSheetListItem & { drawingSet?: { id: string } }
  pdfUrl: string
}

export function DrawingViewerClient({ projectId, sheet, pdfUrl }: DrawingViewerClientProps) {
  const [sheetNavOpen, setSheetNavOpen] = useState(false)

  const drawingSetId = (sheet as { drawingSet?: { id: string } } & DrawingSheetListItem)
    .drawingSet?.id ?? sheet.drawingSetId

  return (
    <div className="flex h-full relative">
      {/*
        Sheet navigator:
        - Desktop (lg+): always visible sidebar
        - Mobile/tablet: slide-in drawer triggered by floating button
      */}
      <div className={[
        "h-full z-20 transition-all duration-200",
        // Desktop: always shown inline
        "hidden lg:flex",
      ].join(" ")}>
        <SheetNavigator
          projectId={projectId}
          drawingSetId={drawingSetId}
          activeSheetId={sheet.id}
          onSheetSelect={() => {}}
        />
      </div>

      {/* Mobile sheet navigator overlay */}
      {sheetNavOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-30 bg-black/50"
            onClick={() => setSheetNavOpen(false)}
          />
          <div className="lg:hidden absolute top-0 left-0 bottom-0 z-40 w-64 flex flex-col">
            <SheetNavigator
              projectId={projectId}
              drawingSetId={drawingSetId}
              activeSheetId={sheet.id}
              onSheetSelect={() => setSheetNavOpen(false)}
            />
          </div>
        </>
      )}

      {/* Drawing area — full width on mobile */}
      <div className="flex-1 h-full min-w-0 relative">
        <DrawingViewport sheet={sheet} pdfUrl={pdfUrl}>
          {/* Phase 5: Device markers rendered here */}
          {/* Phase 7: Redline shapes rendered here */}
        </DrawingViewport>

        {/* Floating sheet navigator toggle — mobile/tablet only */}
        <button
          onClick={() => setSheetNavOpen((v) => !v)}
          className="lg:hidden absolute bottom-6 right-4 z-10 flex items-center gap-2 rounded-full bg-slate-800 text-white px-4 py-3 shadow-lg text-sm font-medium"
        >
          {sheetNavOpen ? <X size={18} /> : <Layers size={18} />}
          {sheetNavOpen ? "Close" : `Sheet ${sheet.sheetNumber}`}
        </button>
      </div>
    </div>
  )
}
