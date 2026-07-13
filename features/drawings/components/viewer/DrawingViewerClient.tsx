"use client"

import { DrawingViewport } from "./DrawingViewport"
import { SheetNavigator } from "./SheetNavigator"
import type { DrawingSheetListItem } from "@/features/drawings/lib/service"

interface DrawingViewerClientProps {
  projectId: string
  sheet: DrawingSheetListItem & { drawingSet?: { id: string } }
  pdfUrl: string
}

export function DrawingViewerClient({ projectId, sheet, pdfUrl }: DrawingViewerClientProps) {
  // The sheet includes drawingSet from the getDrawingSheetWithUrl query
  const drawingSetId = (sheet as { drawingSet?: { id: string } } & DrawingSheetListItem)
    .drawingSet?.id ?? sheet.drawingSetId

  return (
    <div className="flex h-full">
      {/* Sheet navigator sidebar */}
      <SheetNavigator
        projectId={projectId}
        drawingSetId={drawingSetId}
        activeSheetId={sheet.id}
      />

      {/* Drawing viewer — fills remaining space */}
      <div className="flex-1 h-full min-w-0">
        <DrawingViewport sheet={sheet} pdfUrl={pdfUrl}>
          {/* Phase 5: Device markers will be rendered here */}
          {/* Phase 7: Redline shapes will be rendered here */}
        </DrawingViewport>
      </div>
    </div>
  )
}
