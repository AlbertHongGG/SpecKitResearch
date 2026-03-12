import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

  const upstream = await fetch(new URL('/logout', backend), {
    method: 'POST',
    headers: {
      cookie: request.headers.get('cookie') ?? '',
      'content-type': 'application/json',
    },
  });

  const res = NextResponse.redirect(new URL('/login', request.url));
  const setCookie = upstream.headers.getSetCookie?.() ?? [];
  for (const v of setCookie) {
    res.headers.append('set-cookie', v);
  }
  return res;
}
