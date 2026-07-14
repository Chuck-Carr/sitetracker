/**
 * Visual template matching via Normalized Cross-Correlation (NCC).
 *
 * Pure, dependency-free functions so this module can run inside a Web Worker
 * (see `matcher.worker.ts`) as well as on the main thread for tests/fallback.
 *
 * Approach:
 *   1. Downsample the page + template for a fast "coarse" NCC scan (stride 1).
 *   2. NMS the coarse hits, then refine each survivor at full resolution by
 *      searching a small neighborhood for the best NCC score.
 *   3. NMS the refined matches and return them, sorted by score.
 *
 * NCC is used (rather than raw SSD) because it is invariant to brightness/
 * contrast offsets, which makes it robust for line-art CAD symbols.
 *
 * Assumptions (documented for future maintainers):
 *   - Matches share the template's scale and orientation (axis-aligned).
 *     Rotated or rescaled instances are out of scope for this version.
 */

export interface PixelRect {
  x: number
  y: number
  w: number
  h: number
}

export interface PixelMatch extends PixelRect {
  score: number
}

export interface MatchParams {
  /** Grayscale luminance (0..255), length width*height. */
  gray: Float32Array
  width: number
  height: number
  /** Template region in pixel coordinates within the gray buffer. */
  template: PixelRect
  /** NCC score threshold in [0, 1]; higher = stricter. */
  threshold: number
  /** Override the auto-selected coarse downsample factor. */
  coarseFactor?: number
  /** Cap on the number of returned matches. */
  maxResults?: number
}

function clampInt(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(v)))
}

/** RGBA bytes → grayscale luminance (0..255). */
export function rgbaToGray(data: Uint8ClampedArray, width: number, height: number): Float32Array {
  const out = new Float32Array(width * height)
  for (let i = 0, p = 0; i < out.length; i++, p += 4) {
    out[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]
  }
  return out
}

interface Grid {
  data: Float32Array
  width: number
  height: number
}

/** Box-average downsample by an integer factor. Returns the input when f <= 1. */
function downsample(gray: Float32Array, w: number, h: number, f: number): Grid {
  if (f <= 1) return { data: gray, width: w, height: h }
  const nw = Math.max(1, Math.floor(w / f))
  const nh = Math.max(1, Math.floor(h / f))
  const out = new Float32Array(nw * nh)
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      let sum = 0
      let cnt = 0
      const sy = y * f
      const sx = x * f
      for (let j = 0; j < f; j++) {
        const yy = sy + j
        if (yy >= h) break
        const row = yy * w
        for (let i = 0; i < f; i++) {
          const xx = sx + i
          if (xx >= w) break
          sum += gray[row + xx]
          cnt++
        }
      }
      out[y * nw + x] = cnt ? sum / cnt : 0
    }
  }
  return { data: out, width: nw, height: nh }
}

interface Integrals {
  sum: Float64Array
  sq: Float64Array
  sw: number
}

/** Summed-area tables for O(1) window sum and sum-of-squares. */
function integrals(gray: Float32Array, w: number, h: number): Integrals {
  const sw = w + 1
  const sum = new Float64Array(sw * (h + 1))
  const sq = new Float64Array(sw * (h + 1))
  for (let y = 0; y < h; y++) {
    let rowSum = 0
    let rowSq = 0
    const gRow = y * w
    for (let x = 0; x < w; x++) {
      const v = gray[gRow + x]
      rowSum += v
      rowSq += v * v
      const idx = (y + 1) * sw + (x + 1)
      const above = y * sw + (x + 1)
      sum[idx] = sum[above] + rowSum
      sq[idx] = sq[above] + rowSq
    }
  }
  return { sum, sq, sw }
}

function areaSum(I: Float64Array, sw: number, x: number, y: number, w: number, h: number): number {
  const x2 = x + w
  const y2 = y + h
  return I[y2 * sw + x2] - I[y * sw + x2] - I[y2 * sw + x] + I[y * sw + x]
}

interface TemplateStats {
  patch: Float32Array // zero-mean template values
  norm: number // sqrt(sum(patch^2))
  w: number
  h: number
}

function templateStats(gray: Float32Array, imgW: number, rect: PixelRect): TemplateStats {
  const { x, y, w, h } = rect
  const n = w * h
  const patch = new Float32Array(n)
  let mean = 0
  let k = 0
  for (let j = 0; j < h; j++) {
    const row = (y + j) * imgW + x
    for (let i = 0; i < w; i++) {
      const v = gray[row + i]
      patch[k++] = v
      mean += v
    }
  }
  mean /= n
  let norm = 0
  for (let i = 0; i < n; i++) {
    patch[i] -= mean
    norm += patch[i] * patch[i]
  }
  return { patch, norm: Math.sqrt(norm), w, h }
}

/** NCC score in [-1, 1] for the template placed at (x, y). */
function nccAt(
  gray: Float32Array,
  imgW: number,
  sum: Float64Array,
  sq: Float64Array,
  sw: number,
  tpl: TemplateStats,
  x: number,
  y: number,
): number {
  const { patch, norm: tNorm, w, h } = tpl
  const n = w * h
  const wSum = areaSum(sum, sw, x, y, w, h)
  const wSq = areaSum(sq, sw, x, y, w, h)
  const varImg = wSq - (wSum * wSum) / n
  if (varImg <= 1e-6 || tNorm <= 1e-6) return 0
  // Numerator = sum((I - meanI) * patch) = sum(I * patch), since sum(patch) = 0.
  let cross = 0
  let k = 0
  for (let j = 0; j < h; j++) {
    const row = (y + j) * imgW + x
    for (let i = 0; i < w; i++) {
      cross += gray[row + i] * patch[k++]
    }
  }
  return cross / (Math.sqrt(varImg) * tNorm)
}

/** Full stride-1 NCC scan; returns every position scoring >= threshold. */
function scanForMatches(
  gray: Float32Array,
  w: number,
  h: number,
  rect: PixelRect,
  threshold: number,
): PixelMatch[] {
  const tw = rect.w
  const th = rect.h
  if (tw < 2 || th < 2 || tw > w || th > h) return []
  const tpl = templateStats(gray, w, rect)
  const { sum, sq, sw } = integrals(gray, w, h)
  const hits: PixelMatch[] = []
  const maxX = w - tw
  const maxY = h - th
  for (let y = 0; y <= maxY; y++) {
    for (let x = 0; x <= maxX; x++) {
      const s = nccAt(gray, w, sum, sq, sw, tpl, x, y)
      if (s >= threshold) hits.push({ x, y, w: tw, h: th, score: s })
    }
  }
  return hits
}

function iou(a: PixelRect, b: PixelRect): number {
  const x1 = Math.max(a.x, b.x)
  const y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.w, b.x + b.w)
  const y2 = Math.min(a.y + a.h, b.y + b.h)
  const iw = Math.max(0, x2 - x1)
  const ih = Math.max(0, y2 - y1)
  const inter = iw * ih
  const uni = a.w * a.h + b.w * b.h - inter
  return uni > 0 ? inter / uni : 0
}

/** Greedy non-maximum suppression by IoU (highest score wins). */
function nms(matches: PixelMatch[], iouThreshold: number): PixelMatch[] {
  const sorted = [...matches].sort((a, b) => b.score - a.score)
  const kept: PixelMatch[] = []
  for (const m of sorted) {
    let overlaps = false
    for (const k of kept) {
      if (iou(k, m) > iouThreshold) {
        overlaps = true
        break
      }
    }
    if (!overlaps) kept.push(m)
  }
  return kept
}

const MAX_COARSE_HITS = 5000

/**
 * Locate every instance of the template symbol within the grayscale page.
 * Returns matches in pixel coordinates (same space as `gray`), sorted by score.
 */
export function matchTemplate(params: MatchParams): PixelMatch[] {
  const { gray, width: W, height: H, threshold } = params
  const tw = Math.max(2, Math.round(params.template.w))
  const th = Math.max(2, Math.round(params.template.h))
  if (W < tw || H < th) return []
  const tx = clampInt(params.template.x, 0, Math.max(0, W - tw))
  const ty = clampInt(params.template.y, 0, Math.max(0, H - th))

  // Pick a coarse factor so the template's smaller side is ~12px downsampled.
  const COARSE_TPL = 12
  const auto = Math.floor(Math.min(tw, th) / COARSE_TPL)
  const f = Math.max(1, Math.min(params.coarseFactor ?? auto, 6))

  // ── Coarse pass on the downsampled page ──
  const ds = downsample(gray, W, H, f)
  const dTpl: PixelRect = {
    x: Math.floor(tx / f),
    y: Math.floor(ty / f),
    w: Math.max(2, Math.round(tw / f)),
    h: Math.max(2, Math.round(th / f)),
  }
  let coarse = scanForMatches(ds.data, ds.width, ds.height, dTpl, threshold * 0.85)
  coarse.sort((a, b) => b.score - a.score)
  if (coarse.length > MAX_COARSE_HITS) coarse = coarse.slice(0, MAX_COARSE_HITS)
  const coarseKept = nms(coarse, 0.3)

  // ── Refine survivors at full resolution ──
  const tpl = templateStats(gray, W, { x: tx, y: ty, w: tw, h: th })
  const { sum, sq, sw } = integrals(gray, W, H)
  const R = f + 1 // search radius (full-res px) around each coarse hit
  const refined: PixelMatch[] = []
  for (const c of coarseKept) {
    const baseX = c.x * f
    const baseY = c.y * f
    let bestX = baseX
    let bestY = baseY
    let bestScore = -1
    for (let dy = -R; dy <= R; dy++) {
      const py = baseY + dy
      if (py < 0 || py + th > H) continue
      for (let dx = -R; dx <= R; dx++) {
        const px = baseX + dx
        if (px < 0 || px + tw > W) continue
        const s = nccAt(gray, W, sum, sq, sw, tpl, px, py)
        if (s > bestScore) {
          bestScore = s
          bestX = px
          bestY = py
        }
      }
    }
    if (bestScore >= threshold) {
      refined.push({ x: bestX, y: bestY, w: tw, h: th, score: bestScore })
    }
  }

  const result = nms(refined, 0.3)
  result.sort((a, b) => b.score - a.score)
  const max = params.maxResults ?? 500
  return result.length > max ? result.slice(0, max) : result
}
