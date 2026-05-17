// src/middleware.ts — FINAL (Main App + License Manager)

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production-min-32-chars!!"
);

const LICENSE_JWT_SECRET = new TextEncoder().encode(
  process.env.LICENSE_JWT_SECRET ||
  process.env.JWT_SECRET ||
  "license-secret-change-in-production-min-32-chars"
);

// =============================================================
// PUBLIC ROUTES (no auth needed)
// =============================================================

const MAIN_PUBLIC = [
  "/auth/login",
  "/auth/signup",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/api/v1/auth/login",
  "/api/v1/auth/signup",
  "/api/v1/auth/forgot-password",
  "/api/v1/auth/reset-password",
  "/api/v1/auth/verify-otp",
  "/auth/verify",
  "/auth/accept-invite",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/api/v1/auth/accept-invite",
];

const LICENSE_PUBLIC = [
  "/license/login",
  "/api/license/auth/login",
];

// =============================================================
// MIDDLEWARE
// =============================================================

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  // ── LICENSE MANAGER ROUTES ──
  if (pathname.startsWith("/license") || pathname.startsWith("/api/license")) {

    // Public license routes
    if (LICENSE_PUBLIC.some(r => pathname.startsWith(r))) {
      return NextResponse.next();
    }

    // Require license_session cookie
    const licenseToken = req.cookies.get("license_session")?.value;

    if (!licenseToken) {
      if (pathname.startsWith("/api/license")) {
        return NextResponse.json(
          { success: false, error: "UNAUTHORIZED", message: "License admin authentication required" },
          { status: 401 }
        );
      }
      return NextResponse.redirect(new URL("/license/login", req.url));
    }

    try {
      await jwtVerify(licenseToken, LICENSE_JWT_SECRET);
      return NextResponse.next();
    } catch {
      if (pathname.startsWith("/api/license")) {
        return NextResponse.json(
          { success: false, error: "UNAUTHORIZED", message: "Invalid or expired license session" },
          { status: 401 }
        );
      }
      const res = NextResponse.redirect(new URL("/license/login", req.url));
      res.cookies.delete("license_session");
      return res;
    }
  }

  // ── MAIN APP ROUTES ──

  // Public main routes
  if (MAIN_PUBLIC.some(r => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Require calllog_session cookie
  const mainToken = req.cookies.get("calllog_session")?.value;

  if (!mainToken) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  try {
    await jwtVerify(mainToken, JWT_SECRET);
    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "Invalid or expired session" },
        { status: 401 }
      );
    }
    const res = NextResponse.redirect(new URL("/auth/login", req.url));
    res.cookies.delete("calllog_session");
    return res;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
