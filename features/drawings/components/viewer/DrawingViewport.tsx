"use client"

import { useRef, useEffect, useCallback, useState } from "react"
import { useViewerStore } from "@/features/drawings/hooks/use-viewer-store"
import { computeFitZoom } from "@/features/drawings/lib/coordinates"
import { PDFCanvas } from "./PDFCanvas"
import { OverlayLayer } from "./OverlayLayer"
import { ViewerToolbar } from "./ViewerToolbar"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import type { DrawingSheetListItem } from "@/features/drawings/lib/service"
import type { UserRole } from "@/app/generated/prisma/client"

interface DrawingViewportProps {
  sheet: DrawingSheetListItem
  pdfUrl: string
  userRole: UserRole
  /** Optional back-navigation link shown in the toolbar strip. */
  backHref?: string
  /**
   * Render prop — receives the current (renderWidth, renderHeight) in PDF canvas
   * pixels so child overlay components can position themselves correctly.
   */
  children?: (renderWidth: number, renderHeight: number) => React.ReactNode
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
export function DrawingViewport({ sheet, pdfUrl, userRole, backHref, children }: DrawingViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // null = not yet measured; PDF render is gated on this
  const [fitZoom, setFitZoom] = useState<number | null>(null)
  // renderZoom = the zoom level the PDF is actually rendered at.
  // It lags behind the live zoom by ~300ms so the PDF only re-renders
  // after the user stops zooming, keeping it sharp at every zoom level.
  const [renderZoom, setRenderZoom] = useState<number | null>(null)
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
    setFitZoom((prev) => {
      if (prev !== null && Math.abs(prev - z) < 0.01) return prev
      return z
    })
    if (!isReady) {
      setZoom(z)
      setPan(0, 0)
    }
  }, [sheet.widthPoints, sheet.heightPoints, isReady, setZoom, setPan])

  // Set renderZoom immediately when fitZoom is first computed (no debounce
  // for the initial load — we want the first render at the correct size).
  useEffect(() => {
    if (fitZoom !== null && renderZoom === null) {
      setRenderZoom(fitZoom)
    }
  }, [fitZoom, renderZoom])

  // Debounce subsequent zoom changes so the PDF re-renders at full
  // resolution after the user stops zooming, not on every tick.
  useEffect(() => {
    if (renderZoom === null) return // not initialized yet
    const timer = setTimeout(() => setRenderZoom(zoom), 300)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom])

  useEffect(() => {
    computeFit()
    const observer = new ResizeObserver(computeFit)
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [computeFit])

  // Mouse-wheel: plain wheel scrolls/pans; Ctrl/Cmd+wheel zooms.
  // Reads live state via getState() so the callback never goes stale.
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) {
        const { zoom, setZoom } = useViewerStore.getState()
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        setZoom(Math.max(0.1, Math.min(5, zoom + delta)))
      } else {
        const { panX, panY, setPan } = useViewerStore.getState()
        setPan(panX - e.deltaX, panY - e.deltaY)
      }
    },
    [], // reads from getState() — no stale closure risk
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener("wheel", handleWheel, { passive: false })
    return () => el.removeEventListener("wheel", handleWheel)
  }, [handleWheel])

  // ─── Mouse drag-to-pan ───────────────────────────────────────────────────────
  //
  // Three ways to pan without switching to the Pan tool:
  //   1. Middle-mouse button drag
  //   2. Spacebar held + left-click drag
  //   3. Pan tool + left-click drag (existing behaviour)
  //
  // Cases 1 & 2 are intercepted in the capture phase so the OverlayLayer's
  // draw-region handler never sees the mousedown — no accidental device boxes.

  const dragStart = useRef<{ mouseX: number; mouseY: number; panX: number; panY: number } | null>(null)

  // Spacebar ref — used in event handlers without causing re-renders.
  // spaceDownState mirrors it and triggers re-renders for cursor/prop updates.
  const spaceDownRef = useRef(false)
  const [spaceDownState, setSpaceDownState] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.code === "Space" &&
        !e.repeat &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement)
      ) {
        e.preventDefault() // prevent the browser from scrolling the page
        spaceDownRef.current = true
        setSpaceDownState(true)
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") {
        spaceDownRef.current = false
        setSpaceDownState(false)
        dragStart.current = null
        setIsDragging(false)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [])

  /**
   * Capture-phase handler — fires before child onMouseDown handlers.
   * Intercepts middle-mouse and space+left clicks so OverlayLayer never
   * starts a draw-region drag from those interactions.
   */
  function handleMouseDownCapture(e: React.MouseEvent) {
    const isMiddle = e.button === 1
    const isSpaceLeft = e.button === 0 && spaceDownRef.current
    if (!isMiddle && !isSpaceLeft) return
    e.preventDefault()  // suppress middle-mouse autoscroll cursor on Windows
    e.stopPropagation() // prevent OverlayLayer onMouseDown from running
    const { panX, panY } = useViewerStore.getState()
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, panX, panY }
    setIsDragging(true)
  }

  /** Left-click drag while the Pan tool is active. */
  function handleMouseDown(e: React.MouseEvent) {
    if (activeTool !== "pan" || e.button !== 0) return
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, panX, panY }
    setIsDragging(true)
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragStart.current) return
    const dx = e.clientX - dragStart.current.mouseX
    const dy = e.clientY - dragStart.current.mouseY
    setPan(dragStart.current.panX + dx, dragStart.current.panY + dy)
  }

  function handleMouseUp() {
    dragStart.current = null
    setIsDragging(false)
  }

  // ─── Touch: single-finger pan + two-finger pinch-to-zoom ────────────────────
  //
  // React's synthetic onTouchStart/Move/End are passive by default in React 17+,
  // so e.preventDefault() inside them has no effect and the browser's own
  // scroll/zoom fires on top of our handlers. Fix: native addEventListener with
  // { passive: false } so preventDefault() actually works.
  //
  // We also:
  //   - don't call preventDefault on touchstart so the browser still generates
  //     click events from taps → device selection keeps working
  //   - read pan/zoom from useViewerStore.getState() instead of the render
  //     closure to avoid stale values across frames
  //   - use incremental deltas (lastX/lastY updated each frame) for smooth pan
  //   - multiply zoom by the per-frame scale ratio, not the initial zoom
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Local mutable state — lives for the lifetime of the mounted component.
    // Captured by closure; all three handlers share the same variables.
    let mode: "idle" | "pan" | "pinch" = "idle"
    let lastX = 0
    let lastY = 0
    let lastDist = 0

    function onTouchStart(e: TouchEvent) {
      // Passive (no preventDefault) so the browser still emits click from taps.
      if (e.touches.length === 1) {
        mode = "pan"
        lastX = e.touches[0].clientX
        lastY = e.touches[0].clientY
      } else if (e.touches.length >= 2) {
        mode = "pinch"
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        lastDist = Math.hypot(dx, dy)
      }
    }

    function onTouchMove(e: TouchEvent) {
      e.preventDefault() // Works because listener is non-passive
      // Always read live state — avoids stale closure values
      const { panX, panY, zoom, setPan, setZoom } = useViewerStore.getState()

      if (mode === "pan" && e.touches.length === 1) {
        const dx = e.touches[0].clientX - lastX
        const dy = e.touches[0].clientY - lastY
        lastX = e.touches[0].clientX // advance anchor each frame
        lastY = e.touches[0].clientY
        setPan(panX + dx, panY + dy)
      } else if (e.touches.length >= 2) {
        if (mode !== "pinch") {
          // Second finger added mid-drag — transition to pinch
          mode = "pinch"
          const dx0 = e.touches[0].clientX - e.touches[1].clientX
          const dy0 = e.touches[0].clientY - e.touches[1].clientY
          lastDist = Math.hypot(dx0, dy0)
          return
        }
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.hypot(dx, dy)
        if (lastDist > 0) {
          // Scale against CURRENT zoom, not the initial zoom captured at touchstart
          setZoom(Math.max(0.1, Math.min(5, zoom * (dist / lastDist))))
        }
        lastDist = dist // advance anchor each frame
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (e.touches.length === 0) {
        mode = "idle"
      } else if (e.touches.length === 1) {
        // One finger lifted during pinch — continue as single-finger pan
        mode = "pan"
        lastX = e.touches[0].clientX
        lastY = e.touches[0].clientY
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true })
    el.addEventListener("touchmove",  onTouchMove,  { passive: false })
    el.addEventListener("touchend",   onTouchEnd,   { passive: true })
    el.addEventListener("touchcancel", onTouchEnd,  { passive: true })

    return () => {
      el.removeEventListener("touchstart",  onTouchStart)
      el.removeEventListener("touchmove",   onTouchMove)
      el.removeEventListener("touchend",    onTouchEnd)
      el.removeEventListener("touchcancel", onTouchEnd)
    }
  }, []) // empty deps — reads Zustand store via getState(), not the render closure

  // renderZoom drives the actual canvas resolution; zoom drives the CSS scale.
  // While the user is zooming, CSS scale gives instant visual feedback.
  // 300ms after they stop, renderZoom catches up and re-renders at full
  // resolution — sharp PDF at every zoom level, smooth while interacting.
  const resolvedRenderZoom = renderZoom ?? 0
  const baseWidth = resolvedRenderZoom > 0 ? Math.round(sheet.widthPoints * resolvedRenderZoom) : 0
  const baseHeight = resolvedRenderZoom > 0 ? Math.round(sheet.heightPoints * resolvedRenderZoom) : 0
  const cssScale = resolvedRenderZoom > 0 ? zoom / resolvedRenderZoom : 1

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar strip */}
      <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-slate-200 shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {backHref && (
            <Link
              href={backHref}
              className="flex items-center gap-0.5 text-slate-400 hover:text-slate-700 transition-colors shrink-0"
              title="Back to project"
            >
              <ChevronLeft size={18} />
              <span className="text-xs font-medium hidden sm:inline">Project</span>
            </Link>
          )}
          <span className="text-sm font-medium text-slate-700 truncate">
            Sheet {sheet.sheetNumber}
            {sheet.sheetName && <span className="hidden sm:inline"> — {sheet.sheetName}</span>}
          </span>
        </div>
        <ViewerToolbar fitZoom={fitZoom} userRole={userRole} />
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden bg-slate-300 relative"
        style={{
          cursor: isDragging
            ? "grabbing"
            : activeTool === "pan" || spaceDownState
            ? "grab"
            : "default",
          // Tells the browser not to handle touch pan/zoom itself on this
          // element — our native touchmove listener handles it instead.
          touchAction: "none",
        }}
        onMouseDownCapture={handleMouseDownCapture}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
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
          <OverlayLayer
            renderWidth={baseWidth}
            renderHeight={baseHeight}
            isSpacePanning={spaceDownState}
            isDragging={isDragging}
          >
            {children?.(baseWidth, baseHeight)}
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
