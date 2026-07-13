/**
 * Coordinate transform utilities for the SiteTracker drawing viewer.
 *
 * The fundamental rule:
 *   - Persisted coordinates are NORMALIZED: { x, y } in range [0.0, 1.0]
 *     relative to the rendered page dimensions at scale = 1.
 *   - Screen coordinates depend on zoom, pan, and the container size.
 *
 * This keeps device/redline positions stable across zoom levels, screen
 * sizes, and device pixel ratios.
 */

export interface NormalizedPoint {
  x: number // 0.0 – 1.0
  y: number // 0.0 – 1.0
}

export interface ScreenPoint {
  x: number // CSS pixels
  y: number // CSS pixels
}

export interface ViewerTransform {
  zoom: number  // scale factor (1.0 = fit-page)
  panX: number  // CSS pixel offset from origin
  panY: number  // CSS pixel offset from origin
}

/**
 * Convert a normalized point to screen coordinates within the PDF canvas.
 */
export function normalizedToScreen(
  point: NormalizedPoint,
  renderedWidth: number,
  renderedHeight: number,
): ScreenPoint {
  return {
    x: point.x * renderedWidth,
    y: point.y * renderedHeight,
  }
}

/**
 * Convert a screen tap/click coordinate (relative to the canvas element)
 * back to normalized page coordinates.
 */
export function screenToNormalized(
  point: ScreenPoint,
  renderedWidth: number,
  renderedHeight: number,
): NormalizedPoint {
  return {
    x: Math.max(0, Math.min(1, point.x / renderedWidth)),
    y: Math.max(0, Math.min(1, point.y / renderedHeight)),
  }
}

/**
 * Compute the rendered page dimensions from the PDF point dimensions,
 * zoom level, and device pixel ratio.
 *
 * Returns CSS pixel dimensions (what the canvas element should be sized to).
 */
export function computeRenderedSize(
  widthPoints: number,
  heightPoints: number,
  zoom: number,
): { width: number; height: number } {
  return {
    width: widthPoints * zoom,
    height: heightPoints * zoom,
  }
}

/**
 * Compute a zoom level that fits the PDF page within the given container,
 * with optional padding.
 */
export function computeFitZoom(
  widthPoints: number,
  heightPoints: number,
  containerWidth: number,
  containerHeight: number,
  padding = 32,
): number {
  const availW = containerWidth - padding * 2
  const availH = containerHeight - padding * 2
  const scaleW = availW / widthPoints
  const scaleH = availH / heightPoints
  return Math.min(scaleW, scaleH)
}
