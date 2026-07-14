/**
 * Web Worker: runs visual template matching off the main thread so scanning a
 * full drawing never blocks the UI.
 *
 * The project's tsconfig `lib` does not include "webworker", so we avoid
 * worker-only global types and talk to the worker scope through a minimal
 * local interface instead.
 */
import { matchTemplate, rgbaToGray, type PixelMatch, type PixelRect } from "./ncc"

export interface MatchRequest {
  /** Transferred RGBA pixel buffer for the rasterized page. */
  buffer: ArrayBuffer
  width: number
  height: number
  /** Template region in match-resolution pixel coordinates. */
  template: PixelRect
  /** NCC threshold in [0, 1]. */
  threshold: number
}

export interface MatchResponse {
  matches: PixelMatch[]
}

interface WorkerScope {
  onmessage: ((e: MessageEvent<MatchRequest>) => void) | null
  postMessage(message: MatchResponse): void
}

const ctx = globalThis as unknown as WorkerScope

ctx.onmessage = (e) => {
  const { buffer, width, height, template, threshold } = e.data
  const gray = rgbaToGray(new Uint8ClampedArray(buffer), width, height)
  const matches = matchTemplate({ gray, width, height, template, threshold })
  ctx.postMessage({ matches })
}
