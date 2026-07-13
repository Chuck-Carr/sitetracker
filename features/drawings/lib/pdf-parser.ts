import "server-only"
import { PDFDocument } from "pdf-lib"

export interface PDFPageMetadata {
  pageIndex: number // 0-based
  widthPoints: number
  heightPoints: number
  rotation: number
}

export interface PDFMetadata {
  pageCount: number
  pages: PDFPageMetadata[]
}

/**
 * Extracts page count and dimensions from a PDF buffer.
 * Uses pdf-lib which runs purely in Node.js without a worker or canvas.
 * Dimensions are in PDF points (1pt = 1/72 inch).
 */
export async function extractPDFMetadata(buffer: Buffer): Promise<PDFMetadata> {
  const doc = await PDFDocument.load(buffer, {
    // Ignore encryption errors — we only need page geometry
    ignoreEncryption: true,
  })

  const pageCount = doc.getPageCount()
  const pages: PDFPageMetadata[] = []

  for (let i = 0; i < pageCount; i++) {
    const page = doc.getPage(i)
    const { width, height } = page.getSize()
    const rotation = page.getRotation().angle

    // If the page is rotated 90° or 270°, swap width/height so coordinates
    // are always relative to the rendered (visual) dimensions.
    const isRotated = rotation === 90 || rotation === 270
    pages.push({
      pageIndex: i,
      widthPoints: isRotated ? height : width,
      heightPoints: isRotated ? width : height,
      rotation,
    })
  }

  return { pageCount, pages }
}

/**
 * Derives a sheet number from the page index.
 * Sheet numbers are 1-based by default; they can be renamed by the PM later.
 */
export function defaultSheetNumber(pageIndex: number): string {
  return `${pageIndex + 1}`
}
