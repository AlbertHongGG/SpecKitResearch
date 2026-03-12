import { NextResponse, type NextRequest } from 'next/server';

import { getSessionFromCookieHeader } from '@/lib/auth/session';

function isSafeNextPath(path: string | null): path is string {
  return !!path && path.startsWith('/') && !path.startsWith('//');
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');
  const isProtectedRoute = pathname === '/keys' || pathname.startsWith('/keys/') || pathname === '/docs' || pathname.startsWith('/docs/') || isAdminRoute;

  if (!isAuthPage && !isProtectedRoute) {
    return NextResponse.next();
  }

  const session = await getSessionFromCookieHeader(request.headers.get('cookie'));

  if (!session && isProtectedRoute) {
    const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;

    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', next);
    return NextResponse.redirect(url);
  }

  if (session && isAdminRoute && session.role !== 'admin') {
    const url = request.nextUrl.clone();
    url.pathname = '/403';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (session && isAuthPage) {
    const next = request.nextUrl.searchParams.get('next');

    const url = request.nextUrl.clone();
    url.pathname = isSafeNextPath(next) ? next : '/keys';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
