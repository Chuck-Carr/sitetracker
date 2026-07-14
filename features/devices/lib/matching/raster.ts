/**
 * Rasterize a single PDF page to raw RGBA pixels for symbol matching.
 *
 * This renders the page at a bounded "match resolution" that is independent of
 * the on-screen zoom / device-pixel-ratio, so detection results are stable no
 * matter how the user is currently viewing the sheet. It intentionally renders
 * its own bitmap rather than reading the viewer's canvas (which is re-rendered
 * and cancelled as the user zooms/pans).
 *
 * Client-only: uses `document` and dynamically imports pdfjs-dist.
 */
import type * as PDFJSType from "pdfjs-dist"

// pdfjs-dist v6.x uses Map.prototype.getOrInsertComputed (Chrome 136+), which
// is not yet in Safari/WebKit. Mirror the polyfill from PDFCanvas so matching
// works in the same browsers as the viewer.
if (typeof Map !== "undefined" && !("getOrInsertComputed" in Map.prototype)) {
  // @ts-expect-error — polyfilling a proposal-stage Map method
  Map.prototype.getOrInsertComputed = function <K, V>(key: K, callbackFn: (key: K) => V): V {
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

export interface RasterResult {
  /** RGBA pixel bytes, length width*height*4. */
  data: Uint8ClampedArray
  width: number
  height: number
}

/**
 * Render `pageIndex` of the PDF at `pdfUrl` to an in-memory canvas whose
 * longest side is at most `maxDim`, and return its RGBA pixels.
 */
export async function rasterizePage(
  pdfUrl: string,
  pageIndex: number,
  maxDim = 2000,
): Promise<RasterResult> {
  const pdfjs = await getPDFJS()
  const doc = await pdfjs.getDocument({ url: pdfUrl, withCredentials: true }).promise
  try {
    const page = await doc.getPage(pageIndex + 1) // pdf.js pages are 1-based
    const base = page.getViewport({ scale: 1 })
    // Cap the longest side at maxDim (and never upscale beyond 4x).
    const scale = Math.min(maxDim / base.width, maxDim / base.height, 4)
    const viewport = page.getViewport({ scale })
    const width = Math.round(viewport.width)
    const height = Math.round(viewport.height)

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) throw new Error("Could not acquire a 2D canvas context for rasterization")

    await page.render({ canvas, viewport }).promise
    const { data } = ctx.getImageData(0, 0, width, height)
    return { data, width, height }
  } finally {
    doc.cleanup()
    doc.destroy()
  }
}
