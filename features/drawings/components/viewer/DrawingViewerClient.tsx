"use client"

import { useState } from "react"
import { Layers, X } from "lucide-react"
import { DrawingViewport } from "./DrawingViewport"
import { SheetNavigator } from "./SheetNavigator"
import type { DrawingSheetListItem } from "@/features/drawings/lib/service"
import type { UserRole } from "@/app/generated/prisma/client"
import { useViewerStore } from "@/features/drawings/hooks/use-viewer-store"
import { isAdmin } from "@/features/devices/schemas"
import { useSheetDevices } from "@/features/devices/hooks/use-sheet-devices"
import { DeviceRegionLayer } from "@/features/devices/components/DeviceRegionLayer"
import { DeviceDetailPanel } from "@/features/devices/components/DeviceDetailPanel"
import { AddEditDevicePanel } from "@/features/devices/components/AddEditDevicePanel"

interface DrawingViewerClientProps {
  projectId: string
  sheet: DrawingSheetListItem & { drawingSet?: { id: string } }
  pdfUrl: string
  userRole: UserRole
}

export function DrawingViewerClient({ projectId, sheet, pdfUrl, userRole }: DrawingViewerClientProps) {
  const [sheetNavOpen, setSheetNavOpen] = useState(false)
  // When admin clicks Edit on a device in the detail panel
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null)

  const admin = isAdmin(userRole)

  const {
    selectedDeviceId,
    selectDevice,
    pendingRect,
    clearPendingRect,
  } = useViewerStore()

  const { data: devices = [] } = useSheetDevices(projectId, sheet.id)

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) ?? null
  const editDevice = editingDeviceId ? devices.find((d) => d.id === editingDeviceId) ?? null : null

  const drawingSetId = (sheet as { drawingSet?: { id: string } } & DrawingSheetListItem)
    .drawingSet?.id ?? sheet.drawingSetId

  // Panel visibility logic:
  // - AddEdit shows when: admin has drawn a pending rect (create) OR admin clicked edit on a device
  // - Detail shows when: a device is selected AND we're not in edit mode
  const showAddEdit = admin && (!!pendingRect || !!editingDeviceId)
  const showDetail = !!selectedDeviceId && !showAddEdit

  function handleCloseAddEdit() {
    clearPendingRect()
    setEditingDeviceId(null)
  }

  function handleCloseDetail() {
    selectDevice(null)
  }

  function handleEditRequest() {
    if (selectedDeviceId) setEditingDeviceId(selectedDeviceId)
  }

  return (
    <div className="flex h-full relative">
      {/*
        Sheet navigator:
        - Desktop (xl+): always visible sidebar
        - Mobile/tablet/iPad: slide-in drawer triggered by floating button
      */}
      <div className={[
        "h-full z-20 transition-all duration-200",
        "hidden xl:flex",
      ].join(" ")}>
        <SheetNavigator
          projectId={projectId}
          drawingSetId={drawingSetId}
          activeSheetId={sheet.id}
          onSheetSelect={() => {}}
        />
      </div>

      {/* Mobile/tablet sheet navigator overlay */}
      {sheetNavOpen && (
        <>
          <div
            className="xl:hidden fixed inset-0 z-30 bg-black/50"
            onClick={() => setSheetNavOpen(false)}
          />
          <div className="xl:hidden absolute top-0 left-0 bottom-0 z-40 w-64 flex flex-col">
            <SheetNavigator
              projectId={projectId}
              drawingSetId={drawingSetId}
              activeSheetId={sheet.id}
              onSheetSelect={() => setSheetNavOpen(false)}
            />
          </div>
        </>
      )}

      {/* Drawing area */}
      <div className="flex-1 h-full min-w-0 relative">
        <DrawingViewport
          sheet={sheet}
          pdfUrl={pdfUrl}
          userRole={userRole}
          backHref={`/projects/${projectId}`}
        >
          {(renderWidth, renderHeight) => (
            <DeviceRegionLayer
              devices={devices}
              renderWidth={renderWidth}
              renderHeight={renderHeight}
              selectedId={selectedDeviceId}
              onSelect={(id) => {
                selectDevice(id)
                setEditingDeviceId(null)
              }}
            />
          )}
        </DrawingViewport>

        {/* Slide-in panels — absolute within the drawing area */}
        {showDetail && selectedDevice && (
          <DeviceDetailPanel
            device={selectedDevice}
            projectId={projectId}
            sheetId={sheet.id}
            isAdmin={admin}
            onClose={handleCloseDetail}
            onEditRequest={handleEditRequest}
          />
        )}

        {showAddEdit && (
          <AddEditDevicePanel
            projectId={projectId}
            sheetId={sheet.id}
            pendingRect={pendingRect}
            editDevice={editDevice}
            onClose={handleCloseAddEdit}
          />
        )}

        {/* Floating sheet navigator toggle — mobile/tablet/iPad only */}
        <button
          onClick={() => setSheetNavOpen((v) => !v)}
          className="xl:hidden absolute bottom-6 right-4 z-10 flex items-center gap-2 rounded-full bg-slate-800 text-white px-4 py-3 shadow-lg text-sm font-medium"
        >
          {sheetNavOpen ? <X size={18} /> : <Layers size={18} />}
          {sheetNavOpen ? "Close" : `Sheet ${sheet.sheetNumber}`}
        </button>
      </div>
    </div>
  )
}
