"use client"

import { useRef } from "react"
import { useViewerStore } from "@/features/drawings/hooks/use-viewer-store"
import { screenToNormalized, normalizedToScreen } from "@/features/drawings/lib/coordinates"

interface OverlayLayerProps {
  renderWidth: number
  renderHeight: number
  children?: React.ReactNode
  /** True while the user holds spacebar — shows grab cursor and blocks draw-region. */
  isSpacePanning?: boolean
  /** True while any pan drag is in progress — shows grabbing cursor. */
  isDragging?: boolean
}

/**
 * SVG layer that sits exactly over the PDFCanvas.
 * All interactive objects (devices, redlines, highlights) are rendered here.
 * The PDF canvas is never touched.
 *
 * In "draw-region" mode the user drags a rectangle to define a device region.
 * Mouse events are handled here; the live preview and committed rect are stored
 * in the viewer store.
 */
export function OverlayLayer({ renderWidth, renderHeight, children, isSpacePanning = false, isDragging = false }: OverlayLayerProps) {
  const { activeTool, drawingRect, setDrawingRect, commitDrawRect } = useViewerStore()
  const isDrawMode = activeTool === "draw-region"

  // Normalized anchor point for the current drag
  const dragStart = useRef<{ nx: number; ny: number } | null>(null)

  function toNorm(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    return screenToNormalized(
      { x: e.clientX - rect.left, y: e.clientY - rect.top },
      renderWidth,
      renderHeight,
    )
  }

  function handleMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (!isDrawMode) return
    e.preventDefault()
    const { x, y } = toNorm(e)
    dragStart.current = { nx: x, ny: y }
    setDrawingRect({ x, y, w: 0, h: 0 })
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!isDrawMode || !dragStart.current) return
    const { x: cx, y: cy } = toNorm(e)
    const { nx, ny } = dragStart.current
    setDrawingRect({
      x: Math.min(nx, cx),
      y: Math.min(ny, cy),
      w: Math.abs(cx - nx),
      h: Math.abs(cy - ny),
    })
  }

  function handleMouseUp(e: React.MouseEvent<SVGSVGElement>) {
    if (!isDrawMode || !dragStart.current) return
    dragStart.current = null
    // Only commit if the rect is large enough to be intentional
    const dr = useViewerStore.getState().drawingRect
    if (dr && dr.w > 0.005 && dr.h > 0.005) {
      commitDrawRect()
    } else {
      setDrawingRect(null)
    }
  }

  // Convert normalised rect to SVG pixel rect for the preview
  const previewRect = drawingRect
    ? {
        x: normalizedToScreen({ x: drawingRect.x, y: drawingRect.y }, renderWidth, renderHeight).x,
        y: normalizedToScreen({ x: drawingRect.x, y: drawingRect.y }, renderWidth, renderHeight).y,
        w: drawingRect.w * renderWidth,
        h: drawingRect.h * renderHeight,
      }
    : null

  return (
    <svg
      width={renderWidth}
      height={renderHeight}
      viewBox={`0 0 ${renderWidth} ${renderHeight}`}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        cursor: isDragging
          ? "grabbing"
          : isSpacePanning
          ? "grab"
          : isDrawMode
          ? "crosshair"
          : activeTool === "pan"
          ? "grab"
          : "default",
        pointerEvents: activeTool === "pan" ? "none" : "auto",
        overflow: "visible",
        userSelect: "none",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {children}

      {/* Live preview while dragging a new region */}
      {previewRect && (
        <rect
          x={previewRect.x}
          y={previewRect.y}
          width={previewRect.w}
          height={previewRect.h}
          fill="rgba(59,130,246,0.15)"
          stroke="#3b82f6"
          strokeWidth={1.5}
          strokeDasharray="6 3"
          pointerEvents="none"
        />
      )}
    </svg>
  )
}
