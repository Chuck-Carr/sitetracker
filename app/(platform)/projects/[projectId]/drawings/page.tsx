import { notFound } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/lib/auth/session"
import { getProject } from "@/features/projects/lib/service"
import { listDrawingSets } from "@/features/drawings/lib/service"
import { DrawingsClient } from "@/features/drawings/components/upload/drawings-client"

export default async function DrawingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const session = await getSession()
  if (!session) return null

  const [project, drawingSets] = await Promise.all([
    getProject(session.companyId, projectId),
    listDrawingSets(session.companyId, projectId),
  ])

  if (!project) notFound()

  const canUpload = session.role === "SUPER_ADMIN" || session.role === "COMPANY_ADMIN" || session.role === "PROJECT_MANAGER"

  return (
    <div className="h-full overflow-y-auto">
    <div className="p-4 md:p-8">
      {/* Breadcrumb */}
      <div className="mb-1 text-sm text-slate-400">
        <Link href="/projects" className="hover:text-slate-600">Projects</Link>
        {" / "}
        <Link href={`/projects/${projectId}`} className="hover:text-slate-600">{project.name}</Link>
        {" / "}
        <span className="text-slate-600">Drawings</span>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">Drawings</h1>

      <DrawingsClient projectId={projectId} initialDrawingSets={drawingSets} canUpload={canUpload} canDelete={canUpload} />
    </div>
    </div>
  )
}
