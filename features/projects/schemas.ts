import { z } from "zod"

export const createProjectSchema = z.object({
  name: z.string().min(1, { error: "Project name is required" }).trim(),
  number: z.string().trim().optional(),
  description: z.string().trim().optional(),
  address: z.string().trim().optional(),
})

export const updateProjectSchema = createProjectSchema.partial()

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
