import { z } from "zod"

export const createPresignedUploadSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  projectId: z.string().uuid(),
})

export const completeDrawingSetUploadSchema = z.object({
  storageKey: z.string().min(1),
  name: z.string().min(1, { error: "Drawing set name is required" }).trim(),
  originalFileName: z.string().min(1),
  fileSizeBytes: z.number().int().positive(),
})

export const updateDrawingSheetSchema = z.object({
  sheetName: z.string().trim().optional(),
  sortOrder: z.number().int().optional(),
})

export type CreatePresignedUploadInput = z.infer<typeof createPresignedUploadSchema>
export type CompleteDrawingSetUploadInput = z.infer<typeof completeDrawingSetUploadSchema>
export type UpdateDrawingSheetInput = z.infer<typeof updateDrawingSheetSchema>
