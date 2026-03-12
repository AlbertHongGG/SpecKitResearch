import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = new Set(['/login', '/invite']);

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublicPath = Array.from(PUBLIC_PATHS).some((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (isPublicPath) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('jira-lite-session');
  if (!sessionCookie && (pathname.startsWith('/orgs') || pathname.startsWith('/platform') || pathname.startsWith('/projects'))) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnUrl', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/orgs/:path*', '/platform/:path*', '/projects/:path*', '/login', '/invite/:path*'],
};
