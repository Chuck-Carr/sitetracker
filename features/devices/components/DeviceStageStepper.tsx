"use client"

import type { DeviceStatus } from "@/app/generated/prisma/client"
import { cn } from "@/lib/utils/cn"

interface Stage {
  value: DeviceStatus
  label: string
  activeClass: string
  dimClass: string
}

const STAGES: Stage[] = [
  {
    value: "ROUGH_IN",
    label: "Rough In",
    activeClass: "bg-orange-500 text-white border-orange-500",
    dimClass: "bg-orange-50 text-orange-300 border-orange-200",
  },
  {
    value: "INSTALLED",
    label: "Installed",
    activeClass: "bg-blue-600 text-white border-blue-600",
    dimClass: "bg-blue-50 text-blue-300 border-blue-200",
  },
  {
    value: "PROGRAMMED",
    label: "Programmed",
    activeClass: "bg-violet-600 text-white border-violet-600",
    dimClass: "bg-violet-50 text-violet-300 border-violet-200",
  },
  {
    value: "TESTED",
    label: "Tested",
    activeClass: "bg-green-600 text-white border-green-600",
    dimClass: "bg-green-50 text-green-300 border-green-200",
  },
  {
    value: "NEEDS_INFO",
    label: "Needs Info",
    activeClass: "bg-red-600 text-white border-red-600",
    dimClass: "bg-red-50 text-red-300 border-red-200",
  },
]

interface Props {
  status: DeviceStatus
}

export function DeviceStageStepper({ status }: Props) {
  // NOT_STARTED shows all pills dimmed
  const currentIdx = STAGES.findIndex((s) => s.value === status)

  return (
    <div className="flex flex-wrap gap-1.5">
      {STAGES.map((stage, i) => {
        const isActive = stage.value === status
        // All steps up to and including current are "on"; Needs Info is standalone
        const isOn = isActive || (stage.value !== "NEEDS_INFO" && currentIdx >= 0 && i <= currentIdx && status !== "NEEDS_INFO")

        return (
          <span
            key={stage.value}
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border transition-colors",
              isOn ? stage.activeClass : stage.dimClass,
              isActive && "ring-2 ring-offset-1",
              isActive && stage.value === "ROUGH_IN" && "ring-orange-400",
              isActive && stage.value === "INSTALLED" && "ring-blue-400",
              isActive && stage.value === "PROGRAMMED" && "ring-violet-400",
              isActive && stage.value === "TESTED" && "ring-green-400",
              isActive && stage.value === "NEEDS_INFO" && "ring-red-400",
            )}
          >
            {stage.label}
          </span>
        )
      })}
    </div>
  )
}
