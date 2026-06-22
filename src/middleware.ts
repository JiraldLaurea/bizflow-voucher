import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

// Protect the authenticated app (dashboard, validation). Public routes
// (landing pages /claim, /api/claim, login) are left open.
const PROTECTED_PREFIXES = ["/dashboard", "/businesses", "/campaigns", "/users", "/validate"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const needsAuth = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (!needsAuth) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await verifySessionToken(token) : null;
  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/businesses/:path*",
    "/campaigns/:path*",
    "/users/:path*",
    "/validate/:path*",
  ],
};
