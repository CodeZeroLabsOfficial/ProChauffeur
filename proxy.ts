import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/firebase/session-cookie";

/**
 * Network-boundary guard: redirects to /login when the session cookie is
 * absent. Full cryptographic verification + admin-role check happens in the
 * dashboard layout server component (which uses the Admin SDK).
 */
export function proxy(request: NextRequest) {
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
