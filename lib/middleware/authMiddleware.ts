import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE } from '@/lib/utils/constants';

// Path prefixes that require an authenticated session.
export const PROTECTED_PREFIXES = ['/dashboard', '/pipeline', '/allyship'];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
}

/**
 * Edge-safe route protection. We only check for the presence of the auth
 * cookie here (no signature verification — that requires Node crypto and runs
 * server-side in the page layouts). Missing cookie on a protected route
 * redirects to the login page.
 */
export function protectRoutes(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  if (!isProtected(pathname)) {
    return NextResponse.next();
  }

  const hasToken = Boolean(req.cookies.get(AUTH_COOKIE)?.value);
  if (!hasToken) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
