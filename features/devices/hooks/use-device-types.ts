"use client"

import { useQuery } from "@tanstack/react-query"
import type { DeviceTypeListItem } from "@/features/devices/lib/service"

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string }

export function useDeviceTypes(projectId: string) {
  return useQuery({
    queryKey: ["device-types", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/device-types`)
      const json: ApiResponse<DeviceTypeListItem[]> = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    staleTime: 5 * 60_000, // device types rarely change
  })
}
