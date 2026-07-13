import { NextRequest, NextResponse } from "next/server"
import { deleteSession } from "@/lib/auth/session"

/**
 * GET /api/auth/logout
 * Deletes the session cookie and redirects to /login.
 * Using GET so sign-out works as a plain <a> link — no JavaScript required.
 */
export async function GET(request: NextRequest): Promise<Response> {
  await deleteSession()
  return NextResponse.redirect(new URL("/login", request.url))
}
