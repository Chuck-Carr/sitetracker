import "server-only"
import { getSession, type SessionPayload } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import type { UserRole, ProjectMemberRole } from "@/app/generated/prisma/client"

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: 401 | 403 = 401,
  ) {
    super(message)
    this.name = "AuthError"
  }
}

/**
 * Returns the current session or throws 401 if unauthenticated.
 */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) throw new AuthError("Unauthenticated", 401)
  return session
}

/**
 * Returns the session if the user's company role meets the minimum required role.
 * Role hierarchy: SUPER_ADMIN > COMPANY_ADMIN > PROJECT_MANAGER > TECHNICIAN > VIEWER
 */
const ROLE_RANK: Record<UserRole, number> = {
  SUPER_ADMIN: 5,
  COMPANY_ADMIN: 4,
  PROJECT_MANAGER: 3,
  TECHNICIAN: 2,
  VIEWER: 1,
}

export async function requireCompanyRole(
  minimumRole: UserRole,
): Promise<SessionPayload> {
  const session = await requireSession()
  if (ROLE_RANK[session.role] < ROLE_RANK[minimumRole]) {
    throw new AuthError("Insufficient permissions", 403)
  }
  return session
}

/**
 * Returns the session if the user is a member of the specified project.
 * Throws 403 if they are not a member.
 * Throws 404-like 403 to avoid leaking project existence to unauthorized users.
 */
export async function requireProjectAccess(
  projectId: string,
  minimumRole?: ProjectMemberRole,
): Promise<SessionPayload> {
  const session = await requireSession()

  // Super admins and company admins bypass project membership checks
  if (session.role === "SUPER_ADMIN" || session.role === "COMPANY_ADMIN") {
    // Still verify the project belongs to this company
    const project = await prisma.project.findFirst({
      where: { id: projectId, companyId: session.companyId },
      select: { id: true },
    })
    if (!project) throw new AuthError("Project not found or access denied", 403)
    return session
  }

  const member = await prisma.projectMember.findFirst({
    where: {
      projectId,
      userId: session.userId,
      project: { companyId: session.companyId },
    },
    select: { role: true },
  })

  if (!member) throw new AuthError("Project not found or access denied", 403)

  if (minimumRole) {
    const PROJECT_ROLE_RANK: Record<ProjectMemberRole, number> = {
      MANAGER: 3,
      TECHNICIAN: 2,
      VIEWER: 1,
    }
    if (PROJECT_ROLE_RANK[member.role] < PROJECT_ROLE_RANK[minimumRole]) {
      throw new AuthError("Insufficient project permissions", 403)
    }
  }

  return session
}

export async function requireProjectManager(projectId: string): Promise<SessionPayload> {
  return requireProjectAccess(projectId, "MANAGER")
}
