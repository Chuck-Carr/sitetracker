import { notFound } from "next/navigation"
import Link from "next/link"
import { AlertTriangle, CheckCircle2 } from "lucide-react"
import { getSession } from "@/lib/auth/session"
import { getProject, getProjectDeviceStats } from "@/features/projects/lib/service"
import { DonutChart } from "@/components/ui/DonutChart"

// ─── Stage color palette (matches DeviceRegionBox / DeviceStageStepper) ────────
const STAGE_COLORS = {
  ROUGH_IN:   "#f97316", // orange-500
  INSTALLED:  "#2563eb", // blue-600
  PROGRAMMED: "#7c3aed", // violet-600
  TESTED:     "#16a34a", // green-600
} as const

const STAGE_LABELS: Record<string, string> = {
  ROUGH_IN:   "Rough In",
  INSTALLED:  "Installed",
  PROGRAMMED: "Programmed",
  TESTED:     "Tested",
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const session = await getSession()
  if (!session) return null

  const [project, stats] = await Promise.all([
    getProject(session.companyId, projectId),
    getProjectDeviceStats(session.companyId, projectId),
  ])
  if (!project) notFound()

  const { counts, total } = stats
  const needsInfo = counts.NEEDS_INFO ?? 0

  // Weighted completion: each stage contributes a fraction of a device's 100%.
  // NOT_STARTED = 0 pts, ROUGH_IN = 1, INSTALLED = 2, PROGRAMMED = 3, TESTED = 4.
  // NEEDS_INFO is a flag, not a stage — it contributes 0 pts so it doesn’t inflate
  // or deflate the score beyond its device’s lack of any completed stage.
  // Max possible = total devices * 4 (every device at TESTED).
  const STAGE_WEIGHT: Record<string, number> = {
    NOT_STARTED: 0, ROUGH_IN: 1, INSTALLED: 2, PROGRAMMED: 3, TESTED: 4, NEEDS_INFO: 0,
  }
  const totalPoints = Object.entries(counts).reduce(
    (sum, [status, count]) => sum + (STAGE_WEIGHT[status] ?? 0) * count,
    0,
  )
  const maxPoints = total * 4
  const completionPct = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0

  // Breakdown donut segments (excludes NOT_STARTED and NEEDS_INFO)
  const breakdownSegments = [
    { value: counts.ROUGH_IN,   color: STAGE_COLORS.ROUGH_IN,   label: "Rough In" },
    { value: counts.INSTALLED,  color: STAGE_COLORS.INSTALLED,  label: "Installed" },
    { value: counts.PROGRAMMED, color: STAGE_COLORS.PROGRAMMED, label: "Programmed" },
    { value: counts.TESTED,     color: STAGE_COLORS.TESTED,     label: "Tested" },
  ]

  // Total for the breakdown chart excludes NEEDS_INFO (shown separately)
  // Remaining (NOT_STARTED) shows as the background ring
  const breakdownTotal = total

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-8">
        {/* Project header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
          {project.number && <p className="text-sm text-slate-500">#{project.number}</p>}
          {project.address && <p className="mt-1 text-sm text-slate-500">{project.address}</p>}
        </div>

        {/* Top stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Total devices</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{total}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Drawing sets</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{project._count.drawingSets}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Team members</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{project.members.length}</p>
          </div>
        </div>

        {/* Chart row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

          {/* ── Completion donut ── */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Overall Completion
            </p>
            <div className="flex items-center gap-5 flex-1">
              <div className="w-28 h-28 shrink-0">
                <DonutChart
                  segments={[
                    { value: totalPoints, color: "#22c55e", label: "Complete" },
                  ]}
                  total={maxPoints}
              centerText={`${completionPct}%`}
                  centerSubText="complete"
                />
              </div>
              <div className="space-y-1.5 text-sm">
              <p className="font-semibold text-slate-900 tabular-nums">
                  {totalPoints} <span className="font-normal text-slate-500">of {maxPoints} pts</span>
                </p>
                <p className="text-slate-500">
                  {counts.TESTED ?? 0} fully tested
                </p>
              </div>
            </div>
          </div>

          {/* ── Stage breakdown donut ── */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Progress Breakdown
            </p>
            <div className="flex items-center gap-5 flex-1">
              <div className="w-28 h-28 shrink-0">
                <DonutChart
                  segments={breakdownSegments}
                  total={breakdownTotal}
                />
              </div>
              <ul className="space-y-1.5 text-xs min-w-0">
                {breakdownSegments.map((seg) => (
                  <li key={seg.label} className="flex items-center gap-2">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="text-slate-600 truncate">{seg.label}</span>
                    <span className="ml-auto font-semibold text-slate-900 tabular-nums pl-1">
                      {seg.value}
                    </span>
                  </li>
                ))}
                {(counts.NOT_STARTED ?? 0) > 0 && (
                  <li className="flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0 bg-slate-200" />
                    <span className="text-slate-400 truncate">Not started</span>
                    <span className="ml-auto font-semibold text-slate-400 tabular-nums pl-1">
                      {counts.NOT_STARTED}
                    </span>
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* ── Needs Info card ── */}
          <div
            className={
              needsInfo > 0
                ? "rounded-xl border border-red-200 bg-red-50 p-5 flex flex-col"
                : "rounded-xl border border-green-200 bg-green-50 p-5 flex flex-col"
            }
          >
            <p className="text-xs font-semibold uppercase tracking-wide mb-3"
              style={{ color: needsInfo > 0 ? "#b91c1c" : "#15803d" }}
            >
              Needs Info
            </p>
            <div className="flex items-center gap-4 flex-1">
              {needsInfo > 0 ? (
                <>
                  <AlertTriangle
                    size={36}
                    className="text-red-500 shrink-0"
                    strokeWidth={1.75}
                  />
                  <div>
                    <p className="text-3xl font-bold text-red-700 tabular-nums">{needsInfo}</p>
                    <p className="text-sm text-red-600 mt-0.5">
                      {needsInfo === 1 ? "device needs" : "devices need"} attention
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle2
                    size={36}
                    className="text-green-500 shrink-0"
                    strokeWidth={1.75}
                  />
                  <div>
                    <p className="text-xl font-bold text-green-700">All clear</p>
                    <p className="text-sm text-green-600 mt-0.5">No devices flagged</p>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <Link
            href={`/projects/${projectId}/drawings`}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-blue-300 transition-colors"
          >
            Drawings →
          </Link>
        </div>
      </div>
    </div>
  )
}
