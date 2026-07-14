"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { DeviceListItem } from "@/features/devices/lib/service"
import type { DeviceStatus } from "@/app/generated/prisma/client"

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string }

async function fetchDevices(projectId: string, sheetId: string): Promise<DeviceListItem[]> {
  const res = await fetch(`/api/projects/${projectId}/drawing-sheets/${sheetId}/devices`)
  const json: ApiResponse<DeviceListItem[]> = await res.json()
  if (!json.success) throw new Error(json.error)
  return json.data
}

export function useSheetDevices(projectId: string, sheetId: string) {
  return useQuery({
    queryKey: ["devices", projectId, sheetId],
    queryFn: () => fetchDevices(projectId, sheetId),
    staleTime: 30_000,
  })
}

// ─── Create ───────────────────────────────────────────────────────────────────

interface CreateDevicePayload {
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

export function useCreateDevice(projectId: string, sheetId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateDevicePayload) => {
      const res = await fetch(`/api/projects/${projectId}/drawing-sheets/${sheetId}/devices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json: ApiResponse<DeviceListItem> = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["devices", projectId, sheetId] })
    },
  })
}

// ─── Update status (tech) ─────────────────────────────────────────────────────

export function useUpdateDeviceStatus(projectId: string, sheetId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ deviceId, status }: { deviceId: string; status: DeviceStatus }) => {
      const res = await fetch(
        `/api/projects/${projectId}/drawing-sheets/${sheetId}/devices/${deviceId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      )
      const json: ApiResponse<{ id: string; status: DeviceStatus }> = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    // Optimistic update: flip the status in cache immediately
    onMutate: async ({ deviceId, status }) => {
      await qc.cancelQueries({ queryKey: ["devices", projectId, sheetId] })
      const previous = qc.getQueryData<DeviceListItem[]>(["devices", projectId, sheetId])
      qc.setQueryData<DeviceListItem[]>(["devices", projectId, sheetId], (old) =>
        old?.map((d) => (d.id === deviceId ? { ...d, status } : d)) ?? [],
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(["devices", projectId, sheetId], ctx.previous)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["devices", projectId, sheetId] })
    },
  })
}

// ─── Admin full update ────────────────────────────────────────────────────────

interface AdminUpdatePayload {
  deviceId: string
  deviceTypeId?: string
  normalizedX?: number
  normalizedY?: number
  normalizedWidth?: number
  normalizedHeight?: number
  deviceIdentifier?: string
  description?: string
  room?: string
  floor?: string
  loop?: string
  status?: DeviceStatus
}

export function useAdminUpdateDevice(projectId: string, sheetId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ deviceId, ...patch }: AdminUpdatePayload) => {
      const res = await fetch(
        `/api/projects/${projectId}/drawing-sheets/${sheetId}/devices/${deviceId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        },
      )
      const json: ApiResponse<DeviceListItem> = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["devices", projectId, sheetId] })
    },
  })
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export function useDeleteDevice(projectId: string, sheetId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (deviceId: string) => {
      const res = await fetch(
        `/api/projects/${projectId}/drawing-sheets/${sheetId}/devices/${deviceId}`,
        { method: "DELETE" },
      )
      if (!res.ok && res.status !== 204) {
        const json = await res.json()
        throw new Error(json.error ?? "Delete failed")
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["devices", projectId, sheetId] })
    },
  })
}
