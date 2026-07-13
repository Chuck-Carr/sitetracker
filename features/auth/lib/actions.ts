"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db/prisma"
import { createSession, deleteSession } from "@/lib/auth/session"

const loginSchema = z.object({
  email: z.email({ error: "Enter a valid email address" }),
  password: z.string().min(1, { error: "Password is required" }),
})

export type LoginState = {
  errors?: { email?: string[]; password?: string[] }
  message?: string
} | undefined

export async function login(state: LoginState, formData: FormData): Promise<LoginState> {
  const validated = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const { email, password } = validated.data

  const user = await prisma.user.findFirst({
    where: { email, status: "ACTIVE" },
    select: {
      id: true,
      companyId: true,
      name: true,
      email: true,
      passwordHash: true,
      role: true,
    },
  })

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { message: "Invalid email or password" }
  }

  await createSession({
    userId: user.id,
    companyId: user.companyId,
    role: user.role,
    name: user.name,
    email: user.email,
  })

  redirect("/dashboard")
}

export async function logout(): Promise<void> {
  await deleteSession()
  redirect("/login")
}

const registerSchema = z.object({
  name: z.string().min(2, { error: "Name must be at least 2 characters" }).trim(),
  email: z.email({ error: "Enter a valid email address" }),
  password: z
    .string()
    .min(8, { error: "Password must be at least 8 characters" })
    .trim(),
  companyName: z.string().min(2, { error: "Company name must be at least 2 characters" }).trim(),
})

export type RegisterState = {
  errors?: { name?: string[]; email?: string[]; password?: string[]; companyName?: string[] }
  message?: string
} | undefined

export async function register(state: RegisterState, formData: FormData): Promise<RegisterState> {
  const validated = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    companyName: formData.get("companyName"),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const { name, email, password, companyName } = validated.data

  // Check if email already exists
  const existing = await prisma.user.findFirst({ where: { email }, select: { id: true } })
  if (existing) {
    return { message: "An account with this email already exists" }
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")

  const company = await prisma.company.create({
    data: {
      name: companyName,
      slug: `${slug}-${Date.now()}`,
    },
  })

  const user = await prisma.user.create({
    data: {
      companyId: company.id,
      name,
      email,
      passwordHash,
      role: "COMPANY_ADMIN",
    },
  })

  await createSession({
    userId: user.id,
    companyId: company.id,
    role: user.role,
    name: user.name,
    email: user.email,
  })

  redirect("/dashboard")
}
