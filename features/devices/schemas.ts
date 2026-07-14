import { z } from "zod"
import type { UserRole } from "@/app/generated/prisma/client"

// ─── Role helper ──────────────────────────────────────────────────────────────

/** Admin roles can create/edit/delete devices and update any field. */
export function isAdmin(role: UserRole): boolean {
  return role === "COMPANY_ADMIN" || role === "SUPER_ADMIN" || role === "PROJECT_MANAGER"
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

/**
 * Bulk create — admin only. Backs the "find similar symbols" flow, adding many
 * devices of a single type at once. Only the device type + region are set;
 * identifier/loop/floor/room/address/etc. are intentionally left empty so the
 * admin can fill them in (or adjust boxes) afterwards.
 */
export const bulkCreateDeviceSchema = z.object({
  deviceTypeId: z.string().uuid(),
  regions: z
    .array(
      z.object({
        normalizedX: z.number().min(0).max(1),
        normalizedY: z.number().min(0).max(1),
        normalizedWidth: z.number().min(0.001).max(1),
        normalizedHeight: z.number().min(0.001).max(1),
      }),
    )
    .min(1)
    .max(500),
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
