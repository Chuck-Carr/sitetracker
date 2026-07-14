"use client"

import { useEffect, useRef } from "react"
import type * as PDFJSType from "pdfjs-dist"

// pdfjs-dist v6.x uses Map.prototype.getOrInsertComputed which is available in
// Chrome 136+ but not yet in Safari/WebKit (iPad, iPhone, Mac Safari).
// Polyfill it here — before the dynamic PDF.js import — so it's in place
// when pdfjs-dist's module code executes.
if (typeof Map !== "undefined" && !("getOrInsertComputed" in Map.prototype)) {
  // @ts-expect-error — polyfilling a proposal-stage Map method
  Map.prototype.getOrInsertComputed = function <K, V>(
    key: K,
    callbackFn: (key: K) => V,
  ): V {
    if (!this.has(key)) this.set(key, callbackFn(key))
    return this.get(key) as V
  }
}

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
  onError,
}: PDFCanvasProps & { onError?: (msg: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const renderIdRef = useRef(0)
  const renderTaskRef = useRef<PDFJSType.RenderTask | null>(null)
  const docRef = useRef<PDFJSType.PDFDocumentProxy | null>(null)
  const lastUrlRef = useRef<string>("")

  // Store callbacks in refs so changing them never re-triggers the render effect.
  // This is the critical fix: onReady was a new lambda on every parent render,
  // which caused the effect to cancel and restart the PDF render continuously.
  const onReadyRef = useRef(onReady)
  const onErrorRef = useRef(onError)
  useEffect(() => { onReadyRef.current = onReady })
  useEffect(() => { onErrorRef.current = onError })

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
        onReadyRef.current?.(canvas)
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          (err.name === "RenderingCancelledException" ||
            err.message === "Rendering cancelled")
        ) return
        const msg = err instanceof Error ? err.message : String(err)
        console.error("[PDFCanvas] render error", msg)
        onErrorRef.current?.(msg)
      }
    }

    doRender()
  // onReady and onError are intentionally NOT in deps — they're read via refs
  // so changes to them never cancel an in-progress render.
  }, [pdfUrl, pageIndex, renderWidth, renderHeight])

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
