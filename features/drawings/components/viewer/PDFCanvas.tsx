"use client"

import { useEffect, useRef } from "react"
import type * as PDFJSType from "pdfjs-dist"

let pdfjsLib: typeof PDFJSType | null = null

async function getPDFJS(): Promise<typeof PDFJSType> {
  if (pdfjsLib) return pdfjsLib
  const lib = await import("pdfjs-dist")
  lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"
  pdfjsLib = lib
  return lib
}

interface PDFCanvasProps {
  pdfUrl: string
  pageIndex: number
  renderWidth: number
  renderHeight: number
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

  // Incrementing ID — every new render call gets a unique ID.
  // Any async step that sees a mismatch knows it has been superseded and aborts.
  const renderIdRef = useRef(0)
  const renderTaskRef = useRef<PDFJSType.RenderTask | null>(null)
  const docRef = useRef<PDFJSType.PDFDocumentProxy | null>(null)
  const lastUrlRef = useRef<string>("")

  // Single effect covering all dependencies — eliminates the race condition
  // that occurred when TWO separate effects both called render() on mount.
  useEffect(() => {
    if (!canvasRef.current || renderWidth <= 0 || renderHeight <= 0) return
    // Capture a stable non-null reference for the async closure
    const canvas: HTMLCanvasElement = canvasRef.current

    const myId = ++renderIdRef.current

    async function doRender() {
      // ── Step 1: Cancel the previous render and WAIT for it to release the canvas.
      // Calling cancel() is not enough — we must await the promise so PDF.js
      // fully relinquishes the canvas before we call render() again.
      const prevTask = renderTaskRef.current
      renderTaskRef.current = null
      if (prevTask) {
        prevTask.cancel()
        try { await prevTask.promise } catch { /* cancellation throws — expected */ }
      }

      // Bail if a newer render has already been scheduled
      if (myId !== renderIdRef.current) return

      // ── Step 2: Discard cached document if the URL changed
      if (lastUrlRef.current !== pdfUrl) {
        docRef.current?.cleanup()
        docRef.current = null
        lastUrlRef.current = pdfUrl
      }

      try {
        const pdfjs = await getPDFJS()
        if (myId !== renderIdRef.current) return

        // Load (or reuse) the document — withCredentials sends the session cookie
        if (!docRef.current) {
          docRef.current = await pdfjs.getDocument({
            url: pdfUrl,
            withCredentials: true,
          }).promise
        }
        if (myId !== renderIdRef.current) return

        const page = await docRef.current.getPage(pageIndex + 1) // PDF.js is 1-based
        if (myId !== renderIdRef.current) return

        // ── Step 3: Resize canvas and render
        const dpr = window.devicePixelRatio || 1
        const baseViewport = page.getViewport({ scale: 1 })
        const viewport = page.getViewport({
          scale: (renderWidth / baseViewport.width) * dpr,
        })

        canvas.width = viewport.width
        canvas.height = viewport.height
        canvas.style.width = `${renderWidth}px`
        canvas.style.height = `${renderHeight}px`

        const task = page.render({ canvas, viewport })
        renderTaskRef.current = task
        await task.promise

        if (myId !== renderIdRef.current) return // Stale — don't call onReady
        onReady?.(canvas)
      } catch (err: unknown) {
        // RenderingCancelledException is normal — ignore it
        if (
          err instanceof Error &&
          (err.name === "RenderingCancelledException" ||
            err.message === "Rendering cancelled")
        ) return
        console.error("[PDFCanvas] render error", err)
      }
    }

    doRender()
  }, [pdfUrl, pageIndex, renderWidth, renderHeight, onReady])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      renderIdRef.current++ // Invalidate any in-flight render
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
