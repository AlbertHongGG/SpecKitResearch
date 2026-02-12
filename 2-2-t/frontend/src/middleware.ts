import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set('x-pathname', req.nextUrl.pathname + req.nextUrl.search);

  return NextResponse.next({
    request: { headers },
  });
}

export const config = {
  matcher: ['/my-courses/:path*', '/instructor/:path*', '/admin/:path*'],
};
