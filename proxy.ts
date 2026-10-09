import { NextResponse, type NextRequest } from "next/server";

// Redirects visitors without a Supabase session cookie from /admin/* to
// /login (04 §4.2). This is a convenience only, never authorization: it does
// not verify the token, and a forged cookie gets past it. Admin pages and
// every /api/v1/admin/** handler verify the JWT and the admin claim
// themselves, and RLS enforces it again (ADR 0004, CVE-2025-29927). Why no
// token verification here: Proxy may run apart from the app and should not
// depend on shared modules or network calls (Next.js Proxy docs).

// @supabase/ssr stores the session as sb-<project-ref>-auth-token, split
// into .0, .1, ... chunks when it is large.
const SESSION_COOKIE = /^sb-[a-z0-9-]+-auth-token(\.\d+)?$/;

export function proxy(request: NextRequest) {
  const hasSession = request.cookies
    .getAll()
    .some((cookie) => SESSION_COOKIE.test(cookie.name) && cookie.value !== "");
  if (hasSession) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
