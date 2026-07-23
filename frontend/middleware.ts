import { NextRequest, NextResponse } from "next/server";

/**
 * Next.js middleware — runs on every matched route BEFORE rendering.
 *
 * • Page routes   → redirect to /login when no auth cookie
 * • API routes    → return 401 JSON when no auth cookie
 * • Public routes → always allowed through
 */

const PUBLIC_PAGES = ["/login", "/register"];
// Auth endpoints are called precisely when the user is NOT logged in, so they
// must bypass the cookie check below (which otherwise 401s every /api/* route).
const PUBLIC_API = ["/api/auth/login", "/api/auth/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ---- Always allow public pages ----
  if (PUBLIC_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // ---- Always allow public auth API (login/register, used when logged out) ----
  if (PUBLIC_API.some((p) => pathname === p)) {
    return NextResponse.next();
  }

  const token = request.cookies.get("auth_token")?.value;

  // ---- API routes → 401 JSON ----
  if (pathname.startsWith("/api/")) {
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }
    return NextResponse.next();
  }

  // ---- Page routes → redirect to /login ----
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match every route EXCEPT:
     *  - _next/static, _next/image  (Next.js internals)
     *  - favicon.ico, logo.png      (public assets)
     */
    "/((?!_next/static|_next/image|favicon.ico|logo.png).*)",
  ],
};
