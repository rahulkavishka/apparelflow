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

  // If user is on /login and already has a token, redirect to home/dashboard
  if (pathname === "/login") {
    if (sessionToken) {
      return NextResponse.redirect(new URL("/supervisor/orders", request.url));
    }
    return NextResponse.next();
  }

  // If root path "/", redirect to login if unauthenticated or supervisor orders
  if (pathname === "/") {
    if (!sessionToken) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.redirect(new URL("/supervisor/orders", request.url));
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
