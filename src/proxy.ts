import { NextResponse, type NextRequest } from "next/server";

// Auth.js names the database-session cookie with a `__Secure-` prefix over HTTPS.
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

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
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) return;

  const hasSessionCookie = SESSION_COOKIES.some((name) => req.cookies.has(name));
  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
