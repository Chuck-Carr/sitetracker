/**
 * Downscales and recompresses an image File in the browser before upload.
 *
 * Phone-camera photos are often 5–10MB at resolutions far larger than needed
 * for viewing on a device drawing. This draws the image to a canvas capped at
 * `maxDimension` on its longest side and re-encodes it as JPEG, dramatically
 * reducing upload time and storage cost.
 *
 * Falls back to the original file if decoding fails (e.g. an unsupported
 * format like HEIC on a browser without native decode support).
 */
export async function resizeImageFile(
  file: File,
  { maxDimension = 1920, quality = 0.82 }: { maxDimension?: number; quality?: number } = {},
): Promise<File> {
  try {
    const bitmap = await loadBitmap(file)

    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return file

    ctx.drawImage(bitmap, 0, 0, width, height)
    if ("close" in bitmap) bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    )
    if (!blob) return file

    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg"
    return new File([blob], newName, { type: "image/jpeg", lastModified: Date.now() })
  } catch {
    // Decoding failed — upload the original file as-is.
    return file
  }
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file)
  }

  // Fallback for browsers without createImageBitmap support.
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Failed to decode image"))
    }
    img.src = url
  })
}
