import { NextRequest, NextResponse } from "next/server"
import { decryptSession } from "@/lib/auth/session"

const PUBLIC_PATHS = ["/login", "/register"]
const API_PATHS = ["/api"]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow public and API paths through
  if (
    API_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/pdf.worker.min.mjs"
  ) {
    return NextResponse.next()
  }

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  const token = request.cookies.get("st_session")?.value
  const session = token ? await decryptSession(token) : null

  if (!session && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (session && isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
