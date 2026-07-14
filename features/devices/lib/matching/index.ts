/**
 * Public entry point for the "find similar symbols" feature.
 *
 * `findSimilarSymbols` rasterizes the page on the main thread, then hands the
 * pixels to a Web Worker that performs the (CPU-heavy) template matching. All
 * coordinates crossing this boundary are converted to/from normalized [0,1]
 * space so callers never deal with match-resolution pixels.
 */
import type { NormalizedRect } from "@/features/drawings/hooks/use-viewer-store"
import { rasterizePage } from "./raster"
import type { PixelMatch } from "./ncc"
import type { MatchRequest, MatchResponse } from "./matcher.worker"

export interface SymbolMatch {
  /** Match location in normalized [0,1] page coordinates. */
  rect: NormalizedRect
  /** NCC score in [0,1]. */
  score: number
}

export interface FindSimilarParams {
  pdfUrl: string
  pageIndex: number
  /** The highlighted template symbol, in normalized [0,1] coordinates. */
  templateRect: NormalizedRect
  /** NCC threshold in [0,1]; higher = stricter. */
  threshold: number
  /** Longest side of the match-resolution raster (default 2000px). */
  maxDim?: number
}

function runWorker(request: MatchRequest): Promise<PixelMatch[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./matcher.worker.ts", import.meta.url), {
      type: "module",
    })
    worker.onmessage = (e: MessageEvent<MatchResponse>) => {
      resolve(e.data.matches)
      worker.terminate()
    }
    worker.onerror = (e) => {
      reject(new Error(e.message || "Symbol matching worker failed"))
      worker.terminate()
    }
    // Transfer the pixel buffer (zero-copy); it is not used again on this side.
    worker.postMessage(request, [request.buffer])
  })
}

/**
 * Locate every symbol on the page that visually matches `templateRect`.
 * Returns matches in normalized coordinates, sorted by descending score.
 */
export async function findSimilarSymbols({
  pdfUrl,
  pageIndex,
  templateRect,
  threshold,
  maxDim = 2000,
}: FindSimilarParams): Promise<SymbolMatch[]> {
  const { data, width, height } = await rasterizePage(pdfUrl, pageIndex, maxDim)

  const template = {
    x: templateRect.x * width,
    y: templateRect.y * height,
    w: templateRect.w * width,
    h: templateRect.h * height,
  }

  const matches = await runWorker({
    buffer: data.buffer as ArrayBuffer,
    width,
    height,
    template,
    threshold,
  })

  return matches.map((m) => ({
    rect: { x: m.x / width, y: m.y / height, w: m.w / width, h: m.h / height },
    score: m.score,
  }))
}
