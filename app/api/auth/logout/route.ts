import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE } from '@/lib/utils/auth';

export async function POST(req: NextRequest) {
  // Redirect to the login page (303) so the HTML form POST navigates cleanly.
  const res = NextResponse.redirect(new URL('/', req.url), { status: 303 });
  res.cookies.set(AUTH_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return res;
}
