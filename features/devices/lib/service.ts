import "server-only"
import { prisma } from "@/lib/db/prisma"
import { projectScope, tenantScope } from "@/lib/db/tenancy"
import type { DeviceStatus } from "@/app/generated/prisma/client"

// ─── Device Types ─────────────────────────────────────────────────────────────

export async function listDeviceTypes(companyId: string) {
  return prisma.deviceType.findMany({
    where: {
      OR: [{ companyId }, { isSystem: true }],
    },
    orderBy: [{ isSystem: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      code: true,
      category: true,
      isSystem: true,
    },
  })
}

export type DeviceTypeListItem = Awaited<ReturnType<typeof listDeviceTypes>>[number]

// ─── Devices ──────────────────────────────────────────────────────────────────

export async function listDevicesForSheet(
  companyId: string,
  projectId: string,
  sheetId: string,
) {
  return prisma.device.findMany({
    where: {
      ...projectScope(companyId, projectId),
      drawingSheetId: sheetId,
      deletedAt: null,
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      deviceTypeId: true,
      deviceIdentifier: true,
      description: true,
      room: true,
      floor: true,
      loop: true,
      normalizedX: true,
      normalizedY: true,
      normalizedWidth: true,
      normalizedHeight: true,
      status: true,
      deviceType: { select: { id: true, name: true, code: true } },
    },
  })
}

export type DeviceListItem = Awaited<ReturnType<typeof listDevicesForSheet>>[number]

export interface CreateDeviceInput {
  drawingSheetId: string
  deviceTypeId: string
  normalizedX: number
  normalizedY: number
  normalizedWidth: number
  normalizedHeight: number
  deviceIdentifier?: string
  description?: string
  room?: string
  floor?: string
  loop?: string
}

export async function createDevice(
  companyId: string,
  projectId: string,
  userId: string,
  input: CreateDeviceInput,
) {
  return prisma.device.create({
    data: {
      companyId,
      projectId,
      drawingSheetId: input.drawingSheetId,
      deviceTypeId: input.deviceTypeId,
      normalizedX: input.normalizedX,
      normalizedY: input.normalizedY,
      normalizedWidth: input.normalizedWidth,
      normalizedHeight: input.normalizedHeight,
      deviceIdentifier: input.deviceIdentifier ?? null,
      description: input.description ?? null,
      room: input.room ?? null,
      floor: input.floor ?? null,
      loop: input.loop ?? null,
      createdById: userId,
    },
    select: {
      id: true,
      deviceTypeId: true,
      deviceIdentifier: true,
      description: true,
      room: true,
      floor: true,
      loop: true,
      normalizedX: true,
      normalizedY: true,
      normalizedWidth: true,
      normalizedHeight: true,
      status: true,
      deviceType: { select: { id: true, name: true, code: true } },
    },
  })
}

export interface AdminUpdateDeviceInput {
  deviceTypeId?: string
  deviceIdentifier?: string
  description?: string
  room?: string
  floor?: string
  loop?: string
  normalizedX?: number
  normalizedY?: number
  normalizedWidth?: number
  normalizedHeight?: number
  status?: DeviceStatus
}

export async function updateDevice(
  companyId: string,
  projectId: string,
  deviceId: string,
  data: AdminUpdateDeviceInput,
) {
  return prisma.device.update({
    where: { id: deviceId, ...projectScope(companyId, projectId), deletedAt: null },
    data,
    select: {
      id: true,
      deviceTypeId: true,
      deviceIdentifier: true,
      description: true,
      room: true,
      floor: true,
      loop: true,
      normalizedX: true,
      normalizedY: true,
      normalizedWidth: true,
      normalizedHeight: true,
      status: true,
      deviceType: { select: { id: true, name: true, code: true } },
    },
  })
}

export async function updateDeviceStatus(
  companyId: string,
  projectId: string,
  deviceId: string,
  status: DeviceStatus,
) {
  return prisma.device.update({
    where: { id: deviceId, ...projectScope(companyId, projectId), deletedAt: null },
    data: { status },
    select: { id: true, status: true },
  })
}

/** Soft-delete */
export async function deleteDevice(
  companyId: string,
  projectId: string,
  deviceId: string,
) {
  return prisma.device.update({
    where: { id: deviceId, ...projectScope(companyId, projectId), deletedAt: null },
    data: { deletedAt: new Date() },
    select: { id: true },
  })
}
