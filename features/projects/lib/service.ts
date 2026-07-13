import "server-only"
import { prisma } from "@/lib/db/prisma"
import { tenantScope } from "@/lib/db/tenancy"
import type { CreateProjectInput, UpdateProjectInput } from "@/features/projects/schemas"

export async function listProjects(companyId: string) {
  return prisma.project.findMany({
    where: { ...tenantScope(companyId), archivedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      number: true,
      description: true,
      address: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { devices: { where: { deletedAt: null } } },
      },
    },
  })
}

export type ProjectListItem = Awaited<ReturnType<typeof listProjects>>[number]

export async function getProject(companyId: string, projectId: string) {
  return prisma.project.findFirst({
    where: { ...tenantScope(companyId), id: projectId, archivedAt: null },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      },
      _count: {
        select: { devices: { where: { deletedAt: null } }, drawingSets: true },
      },
    },
  })
}

export async function createProject(
  companyId: string,
  userId: string,
  data: CreateProjectInput,
) {
  return prisma.project.create({
    data: {
      ...tenantScope(companyId),
      ...data,
      createdById: userId,
      members: {
        create: { companyId, userId, role: "MANAGER" },
      },
    },
  })
}

export async function updateProject(
  companyId: string,
  projectId: string,
  data: UpdateProjectInput,
) {
  return prisma.project.update({
    where: { id: projectId, ...tenantScope(companyId) },
    data,
  })
}

export async function archiveProject(companyId: string, projectId: string) {
  return prisma.project.update({
    where: { id: projectId, ...tenantScope(companyId) },
    data: { archivedAt: new Date(), status: "ARCHIVED" },
  })
}
