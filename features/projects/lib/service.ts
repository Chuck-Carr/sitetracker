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

export async function getProjectDeviceStats(companyId: string, projectId: string) {
  const groups = await prisma.device.groupBy({
    by: ["status"],
    where: { companyId, projectId, deletedAt: null },
    _count: { _all: true },
  })

  const counts = {
    NOT_STARTED: 0,
    ROUGH_IN: 0,
    INSTALLED: 0,
    PROGRAMMED: 0,
    TESTED: 0,
    NEEDS_INFO: 0,
  } as Record<string, number>

  for (const g of groups) {
    counts[g.status] = g._count._all
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  return { counts, total }
}

export type ProjectDeviceStats = Awaited<ReturnType<typeof getProjectDeviceStats>>

export async function archiveProject(companyId: string, projectId: string) {
  return prisma.project.update({
    where: { id: projectId, ...tenantScope(companyId) },
    data: { archivedAt: new Date(), status: "ARCHIVED" },
  })
}
