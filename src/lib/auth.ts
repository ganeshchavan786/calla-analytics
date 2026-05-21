// ================================================
// FILE: src/lib/auth.ts
// ACTION: Fully replace EXISTING file
// CHANGE: Added organizationId + role in JWT payload
// ================================================

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import type { JwtPayload, SessionUser } from "@/types";
import prisma from "./prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production-min-32-chars!!"
);

const COOKIE_NAME = "calllog_session";
const JWT_EXPIRY = process.env.JWT_EXPIRY || "7d";

// =============================================================
// JWT PAYLOAD — Added organizationId + role
// =============================================================

export interface ExtendedJwtPayload {
  userId: string;
  email: string;
  organizationId?: string;  // ← NEW
  role?: string;            // ← NEW
  iat?: number;
  exp?: number;
}

// =============================================================
// TOKEN OPERATIONS
// =============================================================

export async function signToken(payload: ExtendedJwtPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<ExtendedJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as ExtendedJwtPayload;
  } catch {
    return null;
  }
}

// =============================================================
// COOKIE OPERATIONS
// =============================================================

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getTokenFromCookies(): Promise<string | null> {
  const cookieStore = cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

// =============================================================
// REQUEST EXTRACTION
// =============================================================

export function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return req.cookies.get(COOKIE_NAME)?.value ?? null;
}

// =============================================================
// SESSION HELPERS
// =============================================================

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const token = await getTokenFromCookies();
    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload?.userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, avatarUrl: true },
    });

    if (!user) return null;

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id },
      orderBy: { joinedAt: "asc" },
    });

    return {
      ...user,
      currentOrganizationId: membership?.organizationId ?? "",
      currentRole: (membership?.role as SessionUser["currentRole"]) ?? "MEMBER",
    };
  } catch {
    return null;
  }
}

// =============================================================
// PASSWORD UTILITIES
// =============================================================

export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.compare(password, hash);
}

// =============================================================
// RESET TOKEN
// =============================================================

export function generateResetToken(): string {
  const { randomUUID } = require("crypto");
  return randomUUID();
}
