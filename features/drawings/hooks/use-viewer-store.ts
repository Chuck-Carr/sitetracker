import { create } from "zustand"

export type ViewerTool = "select" | "pan" | "place-device" | "redline"

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
      isPlacementMode: tool === "place-device",
      isRedlineMode: tool === "redline",
    }),

  selectDevice: (id) => set({ selectedDeviceId: id, selectedRedlineId: null }),

  selectRedline: (id) => set({ selectedRedlineId: id, selectedDeviceId: null }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setFilter: (key, values) =>
    set((state) => ({
      activeFilters: { ...state.activeFilters, [key]: values },
    })),

  clearFilters: () => set({ activeFilters: {}, searchQuery: "" }),
}))
