"use client"

import { useEffect, useRef, useCallback } from "react"
import type * as PDFJSType from "pdfjs-dist"

// Worker is set once at module load, not inside the component
let pdfjsLib: typeof PDFJSType | null = null

async function getPDFJS(): Promise<typeof PDFJSType> {
  if (pdfjsLib) return pdfjsLib
  const lib = await import("pdfjs-dist")
  lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"
  pdfjsLib = lib
  return lib
}

interface PDFCanvasProps {
  /** Short-lived presigned URL — refreshed by the parent every 12 min */
  pdfUrl: string
  /** 0-based page index within the PDF document */
  pageIndex: number
  /** CSS pixel width to render at (computed from widthPoints × zoom) */
  renderWidth: number
  /** CSS pixel height to render at */
  renderHeight: number
  /** Called when the canvas is ready and has rendered */
  onReady?: (canvas: HTMLCanvasElement) => void
}

export function PDFCanvas({
  pdfUrl,
  pageIndex,
  renderWidth,
  renderHeight,
  onReady,
}: PDFCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderTaskRef = useRef<PDFJSType.RenderTask | null>(null)
  const docRef = useRef<PDFJSType.PDFDocumentProxy | null>(null)

  const render = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas || renderWidth <= 0 || renderHeight <= 0) return

    // Cancel any in-flight render
    renderTaskRef.current?.cancel()

    try {
      const pdfjs = await getPDFJS()

      // Load (or reuse) the PDF document.
      // withCredentials: true sends the session cookie to the proxy endpoint.
      if (!docRef.current) {
        docRef.current = await pdfjs.getDocument({
          url: pdfUrl,
          withCredentials: true,
        }).promise
      }

      const page = await docRef.current.getPage(pageIndex + 1) // PDF.js is 1-based

      const dpr = window.devicePixelRatio || 1
      const viewport = page.getViewport({
        scale: (renderWidth / page.getViewport({ scale: 1 }).width) * dpr,
      })

      // Size the canvas in physical pixels, display at CSS size
      canvas.width = viewport.width
      canvas.height = viewport.height
      canvas.style.width = `${renderWidth}px`
      canvas.style.height = `${renderHeight}px`

      // pdfjs-dist v6: render() requires canvas element; canvasContext is optional
      renderTaskRef.current = page.render({ canvas, viewport })
      await renderTaskRef.current.promise

      onReady?.(canvas)
    } catch (err) {
      // Ignore cancelled renders; log others
      if ((err as Error).message !== "Rendering cancelled") {
        console.error("[PDFCanvas] render error", err)
      }
    }
  }, [pdfUrl, pageIndex, renderWidth, renderHeight, onReady])

  // Re-render whenever the URL, page, or size changes
  useEffect(() => {
    // When the URL changes (presigned URL refresh), clean up the cached doc
    docRef.current?.cleanup()
    docRef.current = null
    render()
  }, [pdfUrl, pageIndex])

  useEffect(() => {
    render()
  }, [renderWidth, renderHeight])

  useEffect(() => {
    return () => {
      renderTaskRef.current?.cancel()
      docRef.current?.cleanup()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", width: renderWidth, height: renderHeight }}
    />
  )
}
