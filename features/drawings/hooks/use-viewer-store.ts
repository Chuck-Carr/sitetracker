import { create } from "zustand"

export type ViewerTool = "select" | "pan" | "draw-region" | "redline" | "find-similar"

export interface NormalizedRect {
  x: number
  y: number
  w: number
  h: number
}

/** Status of the "find similar symbols" detection session. */
export type DetectionStatus = "idle" | "scanning" | "ready" | "error"

/** One proposed match from symbol detection, awaiting the user's review. */
export interface DetectionCandidate {
  id: string
  rect: NormalizedRect
  score: number
  accepted: boolean
}

interface ViewerState {
  // Transform
  zoom: number
  panX: number
  panY: number

  // Tool
  activeTool: ViewerTool

  // Selection
  selectedDeviceId: string | null
  selectedRedlineId: string | null

  // Search / filter
  searchQuery: string
  activeFilters: Record<string, string[]>

  // UI state
  isPlacementMode: boolean
  isRedlineMode: boolean

  // Rect drawing (admin "draw-region" tool)
  drawingRect: NormalizedRect | null   // live preview while dragging
  pendingRect: NormalizedRect | null   // committed rect, waiting for form

  // Symbol detection ("find-similar" tool)
  templateRect: NormalizedRect | null        // highlighted symbol to match
  detectionCandidates: DetectionCandidate[]  // proposed matches under review
  detectionStatus: DetectionStatus
  detectionError: string | null
}

interface ViewerActions {
  setZoom: (zoom: number) => void
  setPan: (x: number, y: number) => void
  zoomIn: () => void
  zoomOut: () => void
  resetView: (fitZoom: number) => void
  setActiveTool: (tool: ViewerTool) => void
  selectDevice: (id: string | null) => void
  selectRedline: (id: string | null) => void
  setSearchQuery: (q: string) => void
  setFilter: (key: string, values: string[]) => void
  clearFilters: () => void

  // Rect drawing actions
  setDrawingRect: (rect: NormalizedRect | null) => void
  commitDrawRect: () => void   // moves drawingRect → pendingRect/templateRect
  clearPendingRect: () => void

  // Symbol detection actions
  setTemplateRect: (rect: NormalizedRect | null) => void
  setDetectionStatus: (status: DetectionStatus, error?: string | null) => void
  setDetectionCandidates: (candidates: DetectionCandidate[]) => void
  toggleCandidate: (id: string) => void
  setAllCandidatesAccepted: (accepted: boolean) => void
  clearDetection: () => void
}

const ZOOM_STEP = 0.25
const MIN_ZOOM = 0.1
const MAX_ZOOM = 5.0

export const useViewerStore = create<ViewerState & ViewerActions>((set, get) => ({
  // Default state — actual fit zoom is computed by DrawingViewport after render
  zoom: 1.0,
  panX: 0,
  panY: 0,
  activeTool: "select",
  selectedDeviceId: null,
  selectedRedlineId: null,
  searchQuery: "",
  activeFilters: {},
  isPlacementMode: false,
  isRedlineMode: false,
  drawingRect: null,
  pendingRect: null,
  templateRect: null,
  detectionCandidates: [],
  detectionStatus: "idle",
  detectionError: null,

  setZoom: (zoom) => set({ zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)) }),

  setPan: (panX, panY) => set({ panX, panY }),

  zoomIn: () => {
    const next = Math.min(MAX_ZOOM, get().zoom + ZOOM_STEP)
    set({ zoom: next })
  },

  zoomOut: () => {
    const next = Math.max(MIN_ZOOM, get().zoom - ZOOM_STEP)
    set({ zoom: next })
  },

  resetView: (fitZoom: number) => set({ zoom: fitZoom, panX: 0, panY: 0 }),

  setActiveTool: (tool) =>
    set({
      activeTool: tool,
      isPlacementMode: false,
      isRedlineMode: tool === "redline",
      // Cancel any in-progress rect when switching tools
      drawingRect: null,
    }),

  selectDevice: (id) => set({ selectedDeviceId: id, selectedRedlineId: null }),

  selectRedline: (id) => set({ selectedRedlineId: id, selectedDeviceId: null }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setFilter: (key, values) =>
    set((state) => ({
      activeFilters: { ...state.activeFilters, [key]: values },
    })),

  clearFilters: () => set({ activeFilters: {}, searchQuery: "" }),

  setDrawingRect: (rect) => set({ drawingRect: rect }),

  commitDrawRect: () =>
    set((state) => {
      // In find-similar mode the drawn rect becomes the detection template;
      // otherwise it's a pending device region for the add/edit form.
      if (state.activeTool === "find-similar") {
        return {
          templateRect: state.drawingRect,
          drawingRect: null,
          detectionCandidates: [],
          detectionStatus: "idle" as DetectionStatus,
          detectionError: null,
        }
      }
      return {
        pendingRect: state.drawingRect,
        drawingRect: null,
        activeTool: "select" as ViewerTool,
      }
    }),

  clearPendingRect: () => set({ pendingRect: null }),

  setTemplateRect: (templateRect) =>
    set({
      templateRect,
      detectionCandidates: [],
      detectionStatus: "idle",
      detectionError: null,
    }),

  setDetectionStatus: (detectionStatus, detectionError = null) =>
    set({ detectionStatus, detectionError }),

  setDetectionCandidates: (detectionCandidates) =>
    set({ detectionCandidates, detectionStatus: "ready", detectionError: null }),

  toggleCandidate: (id) =>
    set((state) => ({
      detectionCandidates: state.detectionCandidates.map((c) =>
        c.id === id ? { ...c, accepted: !c.accepted } : c,
      ),
    })),

  setAllCandidatesAccepted: (accepted) =>
    set((state) => ({
      detectionCandidates: state.detectionCandidates.map((c) => ({ ...c, accepted })),
    })),

  clearDetection: () =>
    set({
      templateRect: null,
      detectionCandidates: [],
      detectionStatus: "idle",
      detectionError: null,
    }),
}))
