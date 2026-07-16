"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Building2, MapPin, ChevronRight } from "lucide-react"
import { useProjects, useCreateProject } from "@/features/projects/hooks/use-projects"
import { createProjectSchema, type CreateProjectInput } from "@/features/projects/schemas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ProjectListItem } from "@/features/projects/lib/service"

interface ProjectsClientProps {
  initialProjects: ProjectListItem[]
  canCreate?: boolean
}

export function ProjectsClient({ initialProjects, canCreate = false }: ProjectsClientProps) {
  const [showForm, setShowForm] = useState(false)
  const { data: projects = initialProjects } = useProjects()
  const { mutate: createProject, isPending } = useCreateProject()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
  })

  function onSubmit(data: CreateProjectInput) {
    createProject(data, {
      onSuccess: () => {
        reset()
        setShowForm(false)
      },
    })
  }

  return (
    <div className="space-y-4">
      {/* Create form */}
      {canCreate && (
        showForm ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">New project</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Project name *</Label>
                  <Input id="name" placeholder="Airport Terminal Fire Alarm" {...register("name")} />
                  {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="number">Project number</Label>
                  <Input id="number" placeholder="2024-001" {...register("number")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">Site address</Label>
                <Input id="address" placeholder="123 Main St, City, ST 00000" {...register("address")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Input id="description" placeholder="Optional project description" {...register("description")} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isPending} size="sm">
                  {isPending ? "Creating…" : "Create project"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowForm(false); reset() }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <Button onClick={() => setShowForm(true)} size="sm">
            <Plus size={16} />
            New project
          </Button>
        )
      )}

      {/* Project list */}
      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
          <Building2 className="mx-auto mb-3 text-slate-300" size={40} />
          <p className="text-sm font-medium text-slate-600">No projects yet</p>
          <p className="mt-1 text-xs text-slate-400">Create your first project to get started</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900 truncate">{project.name}</span>
                  {project.number && (
                    <span className="text-xs text-slate-400 shrink-0">#{project.number}</span>
                  )}
                </div>
                {project.address && (
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                    <MapPin size={12} />
                    <span className="truncate">{project.address}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                <span className="text-xs text-slate-400">
                  {project._count.devices} device{project._count.devices !== 1 ? "s" : ""}
                </span>
                <ChevronRight size={16} className="text-slate-300" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
