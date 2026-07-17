import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { CreateProjectInput } from "@/features/projects/schemas"
import type { ProjectListItem } from "@/features/projects/lib/service"

const PROJECTS_KEY = ["projects"] as const

async function fetchProjects(): Promise<ProjectListItem[]> {
  const res = await fetch("/api/projects")
  if (!res.ok) throw new Error("Failed to fetch projects")
  const { data } = await res.json()
  return data
}

async function createProjectRequest(input: CreateProjectInput): Promise<ProjectListItem> {
  const res = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error("Failed to create project")
  const { data } = await res.json()
  return data
}

export function useProjects() {
  return useQuery({
    queryKey: PROJECTS_KEY,
    queryFn: fetchProjects,
    refetchInterval: 30_000, // poll every 30s per V1 strategy
  })
}

async function deleteProjectRequest(projectId: string) {
  const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Failed to delete project")
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteProjectRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY })
    },
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createProjectRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY })
    },
  })
}
