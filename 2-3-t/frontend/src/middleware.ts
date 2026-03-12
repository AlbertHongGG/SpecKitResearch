import { NextResponse, type NextRequest } from 'next/server';

export function isSafeNext(value: string | null) {
  if (!value) return true;
  // Only allow site-local absolute paths.
  // Reject protocol-relative URLs (//evil.com) and backslash variants that some
  // user agents normalize into a second leading slash.
  if (!value.startsWith('/')) return false;
  if (value.startsWith('//')) return false;
  if (value.startsWith('/\\')) return false;
  if (value.includes('\\')) return false;
  // Reject control characters that can lead to header splitting / odd parsing.
  if (/[\u0000-\u001F\u007F]/.test(value)) return false;
  return true;
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const nextParam = url.searchParams.get('next');
  if (nextParam && !isSafeNext(nextParam)) {
    url.searchParams.delete('next');
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/register'],
};
