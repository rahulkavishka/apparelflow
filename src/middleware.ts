import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "./lib/auth/session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let API routes and static assets pass through - API routes enforce auth internally
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/components") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  // /login always passes through. The (auth) layout redirects valid sessions to their
  // role home; a stale cookie falls through to the form (no redirect loop).
  if (pathname === "/login") {
    return NextResponse.next();
  }

  // Root: unauthenticated -> /login; otherwise the page redirects by role.
  if (pathname === "/") {
    if (!sessionToken) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // Protected page routes: if no token, redirect to /login
  if (!sessionToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
