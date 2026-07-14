import { notFound } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { getDrawingSheetWithUrl } from "@/features/drawings/lib/service"
import { DrawingViewerClient } from "@/features/drawings/components/viewer/DrawingViewerClient"

export default async function DrawingViewerPage({
  params,
}: {
  params: Promise<{ projectId: string; sheetId: string }>
}) {
  const { projectId, sheetId } = await params
  const session = await getSession()
  if (!session) return null

  const result = await getDrawingSheetWithUrl(session.companyId, projectId, sheetId)
  if (!result) notFound()

  return (
    // Absolute fill — viewer takes the entire main content area, no scrolling
    <div className="absolute inset-0">
      <DrawingViewerClient
        projectId={projectId}
        sheet={result.sheet}
        pdfUrl={result.pdfUrl}
        userRole={session.role}
      />
    </div>
  )
}
