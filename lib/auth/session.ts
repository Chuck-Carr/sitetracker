import "server-only"
import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import type { UserRole } from "@/app/generated/prisma/client"

const SESSION_COOKIE = "st_session"
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export interface SessionPayload {
  userId: string
  companyId: string
  role: UserRole
  name: string
  email: string
  expiresAt: string
}

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error("SESSION_SECRET environment variable is not set")
  return new TextEncoder().encode(secret)
}

export async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey())
}

export async function decryptSession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    })
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

// The Secure flag must only be set when the site is actually served over HTTPS.
// Using NODE_ENV === "production" is wrong for local production testing (preview mode)
// which runs on plain HTTP — the browser won't send Secure cookies over HTTP,
// causing every protected request to fail after login.
function isSecureContext(): boolean {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""
  return appUrl.startsWith("https://")
}

export async function createSession(data: Omit<SessionPayload, "expiresAt">): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
  const payload: SessionPayload = { ...data, expiresAt: expiresAt.toISOString() }
  const token = await encryptSession(payload)

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecureContext(),
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  })
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return decryptSession(token)
}

export async function updateSession(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return

  const payload = await decryptSession(token)
  if (!payload) return

  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
  const newPayload: SessionPayload = { ...payload, expiresAt: expiresAt.toISOString() }
  const newToken = await encryptSession(newPayload)

  cookieStore.set(SESSION_COOKIE, newToken, {
    httpOnly: true,
    secure: isSecureContext(),
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  })
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}
