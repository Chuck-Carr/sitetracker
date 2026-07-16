"use client"

import type { DeviceStatus } from "@/app/generated/prisma/client"
import type { DeviceListItem } from "@/features/devices/lib/service"

interface Props {
  device: DeviceListItem
  renderWidth: number
  renderHeight: number
  isSelected: boolean
  onSelect: (id: string) => void
}

/** Maps DeviceStatus → fill/stroke colors.
 *  `dash` sets strokeDasharray on the box outline when not selected. */
const STATUS_COLORS: Record<DeviceStatus, { fill: string; stroke: string; text: string; dash?: string }> = {
  NOT_STARTED: { fill: "rgba(148,163,184,0.25)", stroke: "#94a3b8",  text: "#64748b" },
  ROUGH_IN:    { fill: "rgba(249,115,22,0.35)",  stroke: "#ea580c",  text: "#7c2d12" }, // orange
  INSTALLED:   { fill: "rgba(37,99,235,0.30)",   stroke: "#2563eb",  text: "#1e3a8a" }, // blue
  PROGRAMMED:  { fill: "rgba(124,58,237,0.30)",  stroke: "#7c3aed",  text: "#3b0764" }, // violet
  TESTED:      { fill: "rgba(34,197,94,0.35)",   stroke: "#16a34a",  text: "#14532d" }, // green
  NEEDS_INFO:  { fill: "rgba(220,38,38,0.35)",   stroke: "#dc2626",  text: "#7f1d1d" }, // red
}

export function DeviceRegionBox({ device, renderWidth, renderHeight, isSelected, onSelect }: Props) {
  const colors = STATUS_COLORS[device.status]

  const px = device.normalizedX * renderWidth
  const py = device.normalizedY * renderHeight
  const pw = device.normalizedWidth * renderWidth
  const ph = device.normalizedHeight * renderHeight

  return (
    <g
      onClick={(e) => { e.stopPropagation(); onSelect(device.id) }}
      style={{ cursor: "pointer" }}
    >
      {/* Background fill */}
      <rect
        x={px}
        y={py}
        width={pw}
        height={ph}
        fill={colors.fill}
        stroke={isSelected ? "#1d4ed8" : colors.stroke}
        strokeWidth={isSelected ? 2.5 : 1.5}
        strokeDasharray={isSelected ? undefined : colors.dash}
        rx={2}
      />

      {/* Selected highlight ring */}
      {isSelected && (
        <rect
          x={px - 2}
          y={py - 2}
          width={pw + 4}
          height={ph + 4}
          fill="none"
          stroke="#1d4ed8"
          strokeWidth={2}
          strokeDasharray="4 2"
          rx={3}
          pointerEvents="none"
        />
      )}
    </g>
  )
}
