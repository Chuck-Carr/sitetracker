"use client"

import type { DeviceListItem } from "@/features/devices/lib/service"
import { DeviceRegionBox } from "./DeviceRegionBox"

interface Props {
  devices: DeviceListItem[]
  renderWidth: number
  renderHeight: number
  selectedId: string | null
  onSelect: (id: string) => void
}

export function DeviceRegionLayer({ devices, renderWidth, renderHeight, selectedId, onSelect }: Props) {
  return (
    <>
      {devices.map((device) => (
        <DeviceRegionBox
          key={device.id}
          device={device}
          renderWidth={renderWidth}
          renderHeight={renderHeight}
          isSelected={selectedId === device.id}
          onSelect={onSelect}
        />
      ))}
    </>
  )
}
