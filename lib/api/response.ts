import { AuthError } from "@/lib/auth/permissions"
import { ZodError } from "zod"

export function ok<T>(data: T, status = 200): Response {
  return Response.json({ success: true, data }, { status })
}

export function created<T>(data: T): Response {
  return ok(data, 201)
}

export function noContent(): Response {
  return new Response(null, { status: 204 })
}

export function badRequest(message: string, errors?: unknown): Response {
  return Response.json({ success: false, error: message, errors }, { status: 400 })
}

export function unauthorized(message = "Unauthenticated"): Response {
  return Response.json({ success: false, error: message }, { status: 401 })
}

export function forbidden(message = "Forbidden"): Response {
  return Response.json({ success: false, error: message }, { status: 403 })
}

export function notFound(message = "Not found"): Response {
  return Response.json({ success: false, error: message }, { status: 404 })
}

export function conflict(message: string): Response {
  return Response.json({ success: false, error: message }, { status: 409 })
}

export function serverError(message = "Internal server error"): Response {
  return Response.json({ success: false, error: message }, { status: 500 })
}

/**
 * Wraps a route handler and converts known error types into appropriate HTTP responses.
 * Catches AuthError, ZodError, and unexpected errors.
 */
export async function handleRoute(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof AuthError) {
      return error.statusCode === 403
        ? forbidden(error.message)
        : unauthorized(error.message)
    }

    if (error instanceof ZodError) {
      return badRequest("Validation failed", error.flatten().fieldErrors)
    }

    console.error("[Route Error]", error)
    return serverError()
  }
}
