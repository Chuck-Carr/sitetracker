import type { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import { requireSession } from "@/lib/auth/permissions"
import { handleRoute, ok, badRequest, forbidden } from "@/lib/api/response"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, { message: "New password must be at least 8 characters" }),
})

export async function PATCH(req: NextRequest): Promise<Response> {
  return handleRoute(async () => {
    const session = await requireSession()
    const body = await req.json()
    const input = schema.parse(body)

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { passwordHash: true },
    })

    if (!user) return forbidden("User not found")

    const valid = await bcrypt.compare(input.currentPassword, user.passwordHash)
    if (!valid) return badRequest("Current password is incorrect")

    const newHash = await bcrypt.hash(input.newPassword, 12)
    await prisma.user.update({
      where: { id: session.userId },
      data: { passwordHash: newHash },
    })

    return ok({ message: "Password updated" })
  })
}
