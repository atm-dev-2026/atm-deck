import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIES } from "@/lib/session-cookie";

/**
 * Optimistic gate only: checks that a session cookie is present, without a
 * database lookup. Proxy runs on every request (API calls and RSC prefetches
 * included), so validating the session here cost an extra DB round trip each
 * time on top of the one every page/route already does via getCurrentUser()/
 * auth() — those remain the real authorization checks. The "already signed in,
 * leave /login" redirect lives in the login page for the same reason: a stale
 * cookie must not bounce between /login and /.
 */
export default function proxy(req: NextRequest) {
  const { pathname, origin } = req.nextUrl;
  // /about is a public landing page (outside the (app) route group, so it never
  // gets the sidebar) — no session required to view it.
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth") || pathname.startsWith("/about")) return;

  const hasSessionCookie = SESSION_COOKIES.some((name) => req.cookies.has(name));
  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    // sw.js / the manifest / its icons are fetched by the browser itself (service
    // worker update checks, installs), which must never be redirected to /login.
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|pwa-icon|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
