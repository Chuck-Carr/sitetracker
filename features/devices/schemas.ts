import { z } from "zod"
import type { UserRole } from "@/app/generated/prisma/client"

// ─── Role helper ──────────────────────────────────────────────────────────────

/** Admin roles can create/edit/delete devices and update any field. */
export function isAdmin(role: UserRole): boolean {
  return role === "COMPANY_ADMIN" || role === "SUPER_ADMIN" || role === "PROJECT_MANAGER"
}

/** Admins and technicians can upload/delete device photos (same roles that can change device status). */
export function canManageDevicePhotos(role: UserRole): boolean {
  return isAdmin(role) || role === "TECHNICIAN"
}

// ─── Validation schemas ───────────────────────────────────────────────────────

export const createDeviceSchema = z.object({
  deviceTypeId: z.string().uuid(),
  normalizedX: z.number().min(0).max(1),
  normalizedY: z.number().min(0).max(1),
  normalizedWidth: z.number().min(0.001).max(1),
  normalizedHeight: z.number().min(0.001).max(1),
  deviceIdentifier: z.string().trim().optional(),
  description: z.string().trim().optional(),
  room: z.string().trim().optional(),
  floor: z.string().trim().optional(),
  loop: z.string().trim().optional(),
})

/** Full update — admin only */
export const adminUpdateDeviceSchema = z.object({
  deviceTypeId: z.string().uuid().optional(),
  normalizedX: z.number().min(0).max(1).optional(),
  normalizedY: z.number().min(0).max(1).optional(),
  normalizedWidth: z.number().min(0.001).max(1).optional(),
  normalizedHeight: z.number().min(0.001).max(1).optional(),
  deviceIdentifier: z.string().trim().optional(),
  description: z.string().trim().optional(),
  room: z.string().trim().optional(),
  floor: z.string().trim().optional(),
  loop: z.string().trim().optional(),
  status: z
    .enum(["NOT_STARTED", "ROUGH_IN", "INSTALLED", "PROGRAMMED", "TESTED", "NEEDS_INFO"])
    .optional(),
})

/** Status-only update — tech */
export const techUpdateDeviceSchema = z.object({
  status: z.enum(["NOT_STARTED", "ROUGH_IN", "INSTALLED", "PROGRAMMED", "TESTED", "NEEDS_INFO"]),
})

export type CreateDeviceInput = z.infer<typeof createDeviceSchema>
export type AdminUpdateDeviceInput = z.infer<typeof adminUpdateDeviceSchema>
export type TechUpdateDeviceInput = z.infer<typeof techUpdateDeviceSchema>

// ─── Device photos ────────────────────────────────────────────────────────────

const ALLOWED_PHOTO_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const

export const presignedDevicePhotoSchema = z.object({
  filename: z.string().min(1),
  contentType: z.enum(ALLOWED_PHOTO_CONTENT_TYPES),
})

export const completeDevicePhotoUploadSchema = z.object({
  storageKey: z.string().min(1),
  originalFileName: z.string().min(1),
  fileSizeBytes: z.number().int().positive(),
  mimeType: z.enum(ALLOWED_PHOTO_CONTENT_TYPES),
})

export type PresignedDevicePhotoInput = z.infer<typeof presignedDevicePhotoSchema>
export type CompleteDevicePhotoUploadInput = z.infer<typeof completeDevicePhotoUploadSchema>
