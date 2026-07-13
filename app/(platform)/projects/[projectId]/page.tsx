import { notFound } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { getProject } from "@/features/projects/lib/service"

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const session = await getSession()
  if (!session) return null

  const project = await getProject(session.companyId, projectId)
  if (!project) notFound()

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
        {project.number && <p className="text-sm text-slate-500">#{project.number}</p>}
        {project.address && <p className="mt-1 text-sm text-slate-500">{project.address}</p>}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total devices</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{project._count.devices}</p>
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

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">
          Drawing viewer, device management, and project tools will be available in upcoming phases.
        </p>
      </div>
    </div>
  )
}
