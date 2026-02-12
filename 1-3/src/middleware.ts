import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const PROTECTED_PREFIXES = ['/transactions', '/reports', '/categories'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isProtected) return NextResponse.next();

  // UX-only check: existence of cookie (real auth enforced server-side in handlers/pages)
  const hasSessionCookie = req.cookies.get('auth_session')?.value;
  if (!hasSessionCookie) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/transactions/:path*', '/reports/:path*', '/categories/:path*'],
};
