import "server-only"

/**
 * Returns a Prisma `where` fragment that scopes any query to the current tenant.
 * Every service function that queries a tenant-owned model must spread this
 * into its `where` clause — it is the primary defense against cross-tenant leaks.
 *
 * Usage:
 *   prisma.project.findMany({
 *     where: { ...tenantScope(companyId), status: "ACTIVE" },
 *   })
 */
export function tenantScope(companyId: string) {
  return { companyId } as const
}

/**
 * Returns a combined scope for queries that must also be restricted to a project.
 */
export function projectScope(companyId: string, projectId: string) {
  return { companyId, projectId } as const
}
