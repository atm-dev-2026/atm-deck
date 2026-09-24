import { NextResponse } from "next/server";
import { auth } from "../auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname, origin } = req.nextUrl;
  const isLoginPage = pathname.startsWith("/login");
  const isAuthApi = pathname.startsWith("/api/auth");

  if (!isLoggedIn && !isLoginPage && !isAuthApi) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", origin));
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
