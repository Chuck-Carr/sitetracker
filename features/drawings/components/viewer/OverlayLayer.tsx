"use client"

import { useViewerStore } from "@/features/drawings/hooks/use-viewer-store"
import { screenToNormalized } from "@/features/drawings/lib/coordinates"

interface OverlayLayerProps {
  renderWidth: number
  renderHeight: number
  /** Called when a placement click happens in placement mode */
  onPlacementClick?: (normalizedX: number, normalizedY: number) => void
  children?: React.ReactNode
}

/**
 * SVG layer that sits exactly over the PDFCanvas.
 * All interactive objects (devices, redlines, highlights) are rendered here.
 * The PDF canvas is never touched.
 */
export function OverlayLayer({
  renderWidth,
  renderHeight,
  onPlacementClick,
  children,
}: OverlayLayerProps) {
  const { isPlacementMode, activeTool } = useViewerStore()

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!isPlacementMode || !onPlacementClick) return
    const rect = e.currentTarget.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const { x, y } = screenToNormalized({ x: screenX, y: screenY }, renderWidth, renderHeight)
    onPlacementClick(x, y)
  }

  return (
    <svg
      width={renderWidth}
      height={renderHeight}
      viewBox={`0 0 ${renderWidth} ${renderHeight}`}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        cursor: isPlacementMode ? "crosshair" : activeTool === "pan" ? "grab" : "default",
        // Never intercept pointer events for pan — the viewport handles that
        pointerEvents: activeTool === "pan" ? "none" : "auto",
        overflow: "visible",
      }}
      onClick={handleClick}
    >
      {children}
    </svg>
  )
}
