import { NextResponse } from 'next/server'

/** Standard success response: { ok: true, data } */
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status })
}

/** Standard error response: { ok: false, error } */
export function apiError(error: string, status = 500) {
  return NextResponse.json({ ok: false, error }, { status })
}

/** 400 Bad Request response */
export function badRequest(message: string) {
  return apiError(message, 400)
}

/** 404 Not Found response */
export function notFound(entity: string) {
  return apiError(`${entity} not found`, 404)
}

/** 409 Conflict response */
export function conflict(message: string) {
  return apiError(message, 409)
}

/** Extract `id` from Next.js dynamic route params */
export async function getPathId(params: Promise<{ id: string }>) {
  const { id } = await params
  return id
}

/**
 * Wraps an async route handler with try/catch + console.error logging.
 * Eliminates repetitive try/catch blocks across all API routes.
 */
export function apiHandler(
  tag: string,
  fn: () => Promise<NextResponse>
): Promise<NextResponse> {
  return fn().catch((error: unknown) => {
    console.error(`[${tag}]`, error)
    return apiError('Internal server error')
  })
}
