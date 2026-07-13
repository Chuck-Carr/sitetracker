"use client"

import { useRef, useEffect, useCallback, useState } from "react"
import { useViewerStore } from "@/features/drawings/hooks/use-viewer-store"
import { computeRenderedSize, computeFitZoom } from "@/features/drawings/lib/coordinates"
import { PDFCanvas } from "./PDFCanvas"
import { OverlayLayer } from "./OverlayLayer"
import { ViewerToolbar } from "./ViewerToolbar"
import type { DrawingSheetListItem } from "@/features/drawings/lib/service"

interface DrawingViewportProps {
  sheet: DrawingSheetListItem
  pdfUrl: string
  children?: React.ReactNode // overlay content (devices, redlines, etc.)
}

/**
 * Main drawing viewer component.
 *
 * Responsibilities:
 * - Owns the scroll/pan container
 * - Computes fit-zoom from container size
 * - Passes render dimensions to PDFCanvas and OverlayLayer
 * - Handles mouse-wheel zoom and drag-pan
 */
export function DrawingViewport({ sheet, pdfUrl, children }: DrawingViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [fitZoom, setFitZoom] = useState(1)
  const [isReady, setIsReady] = useState(false)

  const { zoom, panX, panY, setZoom, setPan, activeTool } = useViewerStore()

  // Compute and apply fit zoom on mount and when container resizes
  const computeFit = useCallback(() => {
    const el = containerRef.current
    if (!el || !sheet.widthPoints || !sheet.heightPoints) return
    const z = computeFitZoom(
      sheet.widthPoints,
      sheet.heightPoints,
      el.clientWidth,
      el.clientHeight,
    )
    setFitZoom(z)
    // Only auto-fit on first mount
    if (!isReady) {
      setZoom(z)
      setPan(0, 0)
    }
  }, [sheet.widthPoints, sheet.heightPoints, isReady, setZoom, setPan])

  useEffect(() => {
    computeFit()
    const observer = new ResizeObserver(computeFit)
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [computeFit])

  // Mouse-wheel zoom (centered on cursor position)
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      const next = Math.max(0.1, Math.min(5, zoom + delta))
      setZoom(next)
    },
    [zoom, setZoom],
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener("wheel", handleWheel, { passive: false })
    return () => el.removeEventListener("wheel", handleWheel)
  }, [handleWheel])

  // Mouse drag-to-pan
  const dragStart = useRef<{ mouseX: number; mouseY: number; panX: number; panY: number } | null>(null)

  function handleMouseDown(e: React.MouseEvent) {
    if (activeTool !== "pan") return
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, panX, panY }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragStart.current) return
    const dx = e.clientX - dragStart.current.mouseX
    const dy = e.clientY - dragStart.current.mouseY
    setPan(dragStart.current.panX + dx, dragStart.current.panY + dy)
  }

  function handleMouseUp() {
    dragStart.current = null
  }

  // Touch support: single-finger pan, two-finger pinch-to-zoom
  const touchState = useRef<{
    lastX: number
    lastY: number
    panX: number
    panY: number
    lastDist: number
    zoom: number
  } | null>(null)

  function handleTouchStart(e: React.TouchEvent) {
    e.preventDefault()
    if (e.touches.length === 1) {
      touchState.current = {
        lastX: e.touches[0].clientX,
        lastY: e.touches[0].clientY,
        panX,
        panY,
        lastDist: 0,
        zoom,
      }
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      touchState.current = { lastX: 0, lastY: 0, panX, panY, lastDist: dist, zoom }
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    e.preventDefault()
    if (!touchState.current) return

    if (e.touches.length === 1) {
      // Single-finger pan — always active regardless of tool on touch devices
      const dx = e.touches[0].clientX - touchState.current.lastX
      const dy = e.touches[0].clientY - touchState.current.lastY
      setPan(touchState.current.panX + dx, touchState.current.panY + dy)
    } else if (e.touches.length === 2) {
      // Two-finger pinch zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      if (touchState.current.lastDist > 0) {
        const scale = dist / touchState.current.lastDist
        const next = Math.max(0.1, Math.min(5, touchState.current.zoom * scale))
        setZoom(next)
      }
      touchState.current.lastDist = dist
    }
  }

  function handleTouchEnd() {
    touchState.current = null
  }

  const { width: renderWidth, height: renderHeight } = computeRenderedSize(
    sheet.widthPoints,
    sheet.heightPoints,
    zoom,
  )

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar strip */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">
            Sheet {sheet.sheetNumber}
            {sheet.sheetName && ` — ${sheet.sheetName}`}
          </span>
          <span className="text-xs text-slate-400">
            {Math.round(sheet.widthPoints / 72 * 10) / 10}" × {Math.round(sheet.heightPoints / 72 * 10) / 10}"
          </span>
        </div>
        <ViewerToolbar fitZoom={fitZoom} />
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden bg-slate-300 relative"
        style={{ cursor: activeTool === "pan" ? "grab" : "default" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Scrollable inner — positioned by pan transform */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px))`,
            width: renderWidth,
            height: renderHeight,
          }}
        >
          {/* PDF background — read only */}
          <PDFCanvas
            pdfUrl={pdfUrl}
            pageIndex={sheet.pageIndex}
            renderWidth={renderWidth}
            renderHeight={renderHeight}
            onReady={() => setIsReady(true)}
          />

          {/* Interactive SVG overlay — never modifies the PDF */}
          <OverlayLayer renderWidth={renderWidth} renderHeight={renderHeight}>
            {children}
          </OverlayLayer>
        </div>
      </div>
    </div>
  )
}
