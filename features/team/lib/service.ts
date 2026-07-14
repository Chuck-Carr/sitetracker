import "server-only"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db/prisma"
import { tenantScope } from "@/lib/db/tenancy"
import type { UserRole, UserStatus } from "@/app/generated/prisma/client"

export async function listTeamMembers(companyId: string) {
  return prisma.user.findMany({
    where: { ...tenantScope(companyId) },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
    },
  })
}

export type TeamMember = Awaited<ReturnType<typeof listTeamMembers>>[number]

export async function createTeamMember(
  companyId: string,
  data: { name: string; email: string; password: string; role: UserRole },
) {
  const existing = await prisma.user.findFirst({
    where: { companyId, email: data.email },
    select: { id: true },
  })
  if (existing) throw new Error("A user with this email already exists")

  const passwordHash = await bcrypt.hash(data.password, 12)

  return prisma.user.create({
    data: {
      companyId,
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      status: "ACTIVE",
    },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
  })
}

export async function updateTeamMemberRole(
  companyId: string,
  userId: string,
  role: UserRole,
) {
  return prisma.user.update({
    where: { id: userId, companyId },
    data: { role },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
  })
}

export async function setTeamMemberStatus(
  companyId: string,
  userId: string,
  status: UserStatus,
) {
  return prisma.user.update({
    where: { id: userId, companyId },
    data: { status },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
  })
}
