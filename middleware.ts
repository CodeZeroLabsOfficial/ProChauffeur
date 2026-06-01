import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/firebase/session-cookie";

/**
 * Auth gate for dashboard routes. Uses middleware.ts (not proxy.ts) for broad
 * Vercel runtime compatibility — Next.js 16 proxy can cause sitewide 404s on Vercel.
 */
export function middleware(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard") && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"]
};
