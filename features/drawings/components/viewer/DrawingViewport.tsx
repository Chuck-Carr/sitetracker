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
  const [isLoading, setIsLoading] = useState(true)
  const [renderError, setRenderError] = useState<string | null>(null)

  // Stable callbacks — useCallback with [] so the reference never changes.
  // If these are inline lambdas, they'd be recreated on every render of
  // DrawingViewport, which would appear in PDFCanvas's effect deps and
  // cancel the render every time zoom/pan state changes.
  const handlePDFReady = useCallback(() => {
    setIsReady(true)
    setIsLoading(false)
    setRenderError(null)
  }, [])

  const handlePDFError = useCallback((msg: string) => {
    setIsLoading(false)
    setRenderError(msg)
  }, [])

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

  // Render the PDF at the fit-zoom resolution and hold it constant.
  // Zoom changes are applied via CSS transform (GPU-accelerated, instant on mobile).
  // This prevents the render from being cancelled every time zoom changes.
  const baseWidth = fitZoom > 0 ? Math.round(sheet.widthPoints * fitZoom) : 0
  const baseHeight = fitZoom > 0 ? Math.round(sheet.heightPoints * fitZoom) : 0
  const cssScale = fitZoom > 0 ? zoom / fitZoom : 1

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar strip */}
      <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-slate-200 shrink-0 gap-2">
        <span className="text-sm font-medium text-slate-700 truncate min-w-0">
          Sheet {sheet.sheetNumber}
          {sheet.sheetName && <span className="hidden sm:inline"> — {sheet.sheetName}</span>}
        </span>
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
        {/* Canvas inner: pan via translate, zoom via CSS scale.
            The canvas is rendered at baseWidth/baseHeight (fit-zoom resolution)
            and scaled with transform — no PDF re-render on every zoom change. */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: baseWidth,
            height: baseHeight,
            transform: `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) scale(${cssScale})`,
            transformOrigin: "center center",
          }}
        >
          {/* PDF background — read only */}
          <PDFCanvas
            pdfUrl={pdfUrl}
            pageIndex={sheet.pageIndex}
            renderWidth={baseWidth}
            renderHeight={baseHeight}
            onReady={handlePDFReady}
            onError={handlePDFError}
          />

          {/* Interactive SVG overlay — never modifies the PDF */}
          <OverlayLayer renderWidth={baseWidth} renderHeight={baseHeight}>
            {children}
          </OverlayLayer>
        </div>

        {/* Loading overlay */}
        {isLoading && !renderError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-300">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 rounded-full border-4 border-slate-400 border-t-blue-500 animate-spin" />
              <p className="text-sm text-slate-600 font-medium">Loading drawing…</p>
            </div>
          </div>
        )}

        {/* Error overlay — shows the actual error so we can diagnose on mobile */}
        {renderError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-200">
            <div className="mx-4 rounded-xl bg-white border border-red-200 p-6 max-w-sm shadow-lg">
              <p className="font-semibold text-red-700 mb-2">Failed to load drawing</p>
              <p className="text-xs text-slate-500 break-all mb-4">{renderError}</p>
              <button
                onClick={() => { setRenderError(null); setIsLoading(true) }}
                className="w-full rounded-lg bg-blue-600 text-white py-2 text-sm font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
