import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ACCESS_COOKIE = 'tl_access';

export function middleware(request: NextRequest) {
    const { pathname, search } = request.nextUrl;

    const isProtected = pathname.startsWith('/projects');
    if (!isProtected) return NextResponse.next();

    const hasAccess = request.cookies.get(ACCESS_COOKIE)?.value;
    if (hasAccess) return NextResponse.next();

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('returnTo', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
}

export const config = {
    matcher: ['/projects/:path*'],
};
