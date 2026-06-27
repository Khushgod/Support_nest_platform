import { NextRequest } from 'next/server';
import { protectRoutes } from '@/lib/middleware/authMiddleware';

export function middleware(req: NextRequest) {
  return protectRoutes(req);
}

// Only run middleware on the protected route trees (and skip static assets).
export const config = {
  matcher: ['/dashboard/:path*', '/pipeline/:path*', '/allyship/:path*'],
};
