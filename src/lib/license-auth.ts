// src/lib/license-auth.ts
// License Manager Auth — Completely separate from main app auth
// Uses different cookie: license_session (not calllog_session)

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import prisma from "./prisma";

const LICENSE_JWT_SECRET = new TextEncoder().encode(
  process.env.LICENSE_JWT_SECRET ||
  process.env.JWT_SECRET ||
  "license-secret-change-in-production-min-32-chars"
);

const LICENSE_COOKIE = "license_session"; // ← different from calllog_session
const LICENSE_JWT_EXPIRY = "8h";

export interface LicenseJwtPayload {
  superAdminId: string;
  email: string;
  iat?: number;
  exp?: number;
}

// =============================================================
// TOKEN
// =============================================================

export async function signLicenseToken(payload: LicenseJwtPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(LICENSE_JWT_EXPIRY)
    .sign(LICENSE_JWT_SECRET);
}

export async function verifyLicenseToken(
  token: string
): Promise<LicenseJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, LICENSE_JWT_SECRET);
    return payload as unknown as LicenseJwtPayload;
  } catch {
    return null;
  }
}

// =============================================================
// COOKIE
// =============================================================

export async function setLicenseCookie(token: string): Promise<void> {
  const cookieStore = cookies();
  cookieStore.set(LICENSE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 hours
    path: "/",
  });
}

export async function clearLicenseCookie(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(LICENSE_COOKIE);
}

// =============================================================
// REQUEST EXTRACTION
// =============================================================

export function getLicenseTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  return req.cookies.get(LICENSE_COOKIE)?.value ?? null;
}

// =============================================================
// GET CURRENT SUPER ADMIN
// =============================================================

export async function getCurrentSuperAdmin() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(LICENSE_COOKIE)?.value;
    if (!token) return null;

    const payload = await verifyLicenseToken(token);
    if (!payload?.superAdminId) return null;

    return prisma.superAdmin.findUnique({
      where: { id: payload.superAdminId },
      select: { id: true, email: true, name: true, createdAt: true },
    });
  } catch {
    return null;
  }
}

// =============================================================
// API RESPONSE HELPERS
// =============================================================

export function licenseApiSuccess<T>(data: T, status = 200) {
  const { NextResponse } = require("next/server");
  return NextResponse.json({ success: true, data }, { status });
}

export function licenseApiError(error: string, message: string, status: number) {
  const { NextResponse } = require("next/server");
  return NextResponse.json({ success: false, error, message }, { status });
}

// =============================================================
// MIDDLEWARE WRAPPER
// =============================================================

export function withLicenseAuth(
  handler: (req: NextRequest, adminId: string) => Promise<Response>
) {
  return async (req: NextRequest): Promise<Response> => {
    const token = getLicenseTokenFromRequest(req);
    if (!token) {
      return licenseApiError("UNAUTHORIZED", "License admin authentication required", 401);
    }

    const payload = await verifyLicenseToken(token);
    if (!payload?.superAdminId) {
      return licenseApiError("UNAUTHORIZED", "Invalid or expired license session", 401);
    }

    return handler(req, payload.superAdminId);
  };
}
