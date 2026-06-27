import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { AuthUser, Role } from '@/lib/types';
import { AUTH_COOKIE, verifyToken } from '@/lib/utils/auth';

/**
 * Read the authenticated user from the request cookie.
 * Works in Route Handlers and Server Components (uses next/headers cookies()).
 * Returns null when there is no valid session.
 */
export function getAuthUser(): AuthUser | null {
  const token = cookies().get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Variant that reads from an explicit NextRequest (used inside Route Handlers
 * that already have the request object, and from edge middleware-style code).
 */
export function getAuthUserFromRequest(req: NextRequest): AuthUser | null {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Guard a Route Handler: returns the user, or a 401/403 NextResponse to return
 * directly. Usage:
 *   const result = requireRole(req, 'program_manager');
 *   if (result instanceof NextResponse) return result;
 *   const user = result;
 */
export function requireRole(
  req: NextRequest,
  ...allowedRoles: Role[]
): AuthUser | NextResponse {
  const user = getAuthUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return user;
}
