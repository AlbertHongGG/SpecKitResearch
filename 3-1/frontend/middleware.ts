import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedPaths = ['/cart', '/checkout', '/orders', '/seller', '/admin'];

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const needsAuth = protectedPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (!needsAuth) return NextResponse.next();

  const cookieName = 'sid';
  const sid = req.cookies.get(cookieName)?.value;
  if (!sid) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  const isAdminPath = pathname === '/admin' || pathname.startsWith('/admin/');
  const isSellerPath = pathname === '/seller' || pathname.startsWith('/seller/');
  const isSellerApplyPath = pathname === '/seller/apply' || pathname.startsWith('/seller/apply/');

  // Seller apply/status is for non-sellers too.
  const needsRoleCheck = isAdminPath || (isSellerPath && !isSellerApplyPath);
  if (!needsRoleCheck) return NextResponse.next();

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
  return (async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        cookie: req.headers.get('cookie') ?? '',
      },
      cache: 'no-store',
    });

    if (res.status === 401) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }

    if (!res.ok) {
      const url = req.nextUrl.clone();
      url.pathname = '/403';
      return NextResponse.redirect(url);
    }

    const me = (await res.json()) as { roles?: string[] };
    const roles = me.roles ?? [];

    if (isAdminPath && !roles.includes('admin')) {
      const url = req.nextUrl.clone();
      url.pathname = '/403';
      return NextResponse.redirect(url);
    }

    if (isSellerPath && !(roles.includes('seller') || roles.includes('admin'))) {
      const url = req.nextUrl.clone();
      url.pathname = '/403';
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  })();
}

export const config = {
  matcher: ['/cart/:path*', '/checkout/:path*', '/orders/:path*', '/seller/:path*', '/admin/:path*'],
};
