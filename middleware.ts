import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { AUTH_COOKIE } from '@/lib/utils/constants';
import { ROLE_HOME, Role } from '@/lib/types';

// Which roles may access each protected route prefix.
const ROLE_ROUTES: Record<string, Role[]> = {
  '/dashboard': ['program_manager'],
  '/requisitions': ['program_manager'],
  '/candidates': ['program_manager'],
  '/stakeholders': ['program_manager'],
  '/roi': ['program_manager'],
  '/pipeline': ['talent_acquisition'],
  '/genetranslate': ['talent_acquisition'],
  '/assessments': ['talent_acquisition', 'program_manager'],
  '/interview-prep': ['talent_acquisition'],
  '/allyship': ['employee_hr'],
  '/modules': ['employee_hr'],
  '/certificates': ['employee_hr'],
  '/my-team': ['employee_hr'],
};

function allowedRolesFor(pathname: string): Role[] | null {
  for (const [prefix, roles] of Object.entries(ROLE_ROUTES)) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) {
      return roles;
    }
  }
  return null;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const allowedRoles = allowedRolesFor(pathname);
  if (!allowedRoles) return NextResponse.next();

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as Role;

    // Wrong role → bounce to that role's own home.
    if (!allowedRoles.includes(role)) {
      return NextResponse.redirect(new URL(ROLE_HOME[role] ?? '/', req.url));
    }
    return NextResponse.next();
  } catch {
    // Invalid/expired token → back to login.
    return NextResponse.redirect(new URL('/', req.url));
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/requisitions/:path*',
    '/candidates/:path*',
    '/stakeholders/:path*',
    '/roi/:path*',
    '/pipeline/:path*',
    '/genetranslate/:path*',
    '/assessments/:path*',
    '/interview-prep/:path*',
    '/allyship/:path*',
    '/modules/:path*',
    '/certificates/:path*',
    '/my-team/:path*',
  ],
};
