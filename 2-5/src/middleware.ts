import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/cookies";

function buildLoginUrl(req: NextRequest) {
  const url = req.nextUrl.clone();
  const returnTo = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  url.pathname = "/login";
  url.searchParams.set("returnTo", returnTo);
  return url;
}

async function fetchMe(req: NextRequest) {
  const url = new URL("/api/me", req.nextUrl.origin);
  const cookie = req.headers.get("cookie") ?? "";

  return fetch(url, {
    headers: {
      cookie,
    },
    cache: "no-store",
  });
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  const needsAuth =
    pathname.startsWith("/threads/new") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/mod");

  if (!needsAuth) return NextResponse.next();

  const sessionCookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionCookie) {
    return NextResponse.redirect(buildLoginUrl(req));
  }

  // NOTE: middleware runs at Edge runtime; we can't access DB directly.
  // For role/scope checks, we call our own /api/me (Node runtime).
  if (pathname.startsWith("/admin") || pathname.startsWith("/mod")) {
    const meRes = await fetchMe(req);

    if (meRes.status === 401) {
      return NextResponse.redirect(buildLoginUrl(req));
    }

    if (!meRes.ok) {
      return NextResponse.redirect(new URL("/forbidden", req.nextUrl.origin));
    }

    const me = (await meRes.json()) as {
      user: { role: string };
      moderatorBoards: Array<{ boardId: string }>;
    };

    const isAdmin = me.user.role === "admin";

    if (pathname.startsWith("/admin")) {
      if (!isAdmin) return NextResponse.redirect(new URL("/forbidden", req.nextUrl.origin));
      return NextResponse.next();
    }

    // /mod: allow admin or users with any moderator assignment
    const hasModScope = me.moderatorBoards.length > 0;
    if (!isAdmin && !hasModScope) {
      return NextResponse.redirect(new URL("/forbidden", req.nextUrl.origin));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/threads/new", "/admin/:path*", "/mod/:path*"],
};
