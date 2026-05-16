// src/lib/middleware.ts — FINAL

import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromRequest } from "./auth";
import prisma from "./prisma";
import type { MemberRole, SessionUser } from "@/types";

export interface AuthContext {
  user: SessionUser;
  organizationId: string;
  role: MemberRole;
}

type ApiHandler = (
  req: NextRequest,
  ctx: AuthContext,
  params?: Record<string, string>
) => Promise<NextResponse>;

const ROLE_HIERARCHY: Record<MemberRole, number> = {
  OWNER: 4, ADMIN: 3, MEMBER: 2, GUEST: 1,
};

export function hasPermission(userRole: MemberRole, requiredRole: MemberRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function canInviteMembers(role: MemberRole): boolean { return hasPermission(role, "ADMIN"); }
export function canDeleteProject(role: MemberRole): boolean { return hasPermission(role, "OWNER"); }
export function canManageSettings(role: MemberRole): boolean { return hasPermission(role, "ADMIN"); }
export function canImportCallLogs(role: MemberRole): boolean { return hasPermission(role, "MEMBER"); }
export function canExportReports(role: MemberRole): boolean { return hasPermission(role, "ADMIN"); }

export function withAuth(handler: ApiHandler, requiredRole?: MemberRole) {
  return async (
    req: NextRequest,
    { params }: { params?: Record<string, string> } = {}
  ): Promise<NextResponse> => {
    try {
      const token = getTokenFromRequest(req);
      if (!token) return apiError("UNAUTHORIZED", "Authentication required", 401);

      const payload = await verifyToken(token);
      if (!payload?.userId) return apiError("UNAUTHORIZED", "Invalid or expired token", 401);

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, name: true, avatarUrl: true },
      });
      if (!user) return apiError("UNAUTHORIZED", "User not found", 401);

      const organizationId =
        params?.orgId ||
        req.headers.get("x-organization-id") ||
        req.nextUrl.searchParams.get("orgId");

      if (!organizationId) return apiError("BAD_REQUEST", "Organization ID required", 400);

      const membership = await prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId: user.id } },
      });
      if (!membership) return apiError("FORBIDDEN", "You are not a member of this organization", 403);

      const role = membership.role as MemberRole;

      if (requiredRole && !hasPermission(role, requiredRole)) {
        return apiError("FORBIDDEN", `Requires ${requiredRole} role or higher`, 403);
      }

      const ctx: AuthContext = {
        user: { ...user, currentOrganizationId: organizationId, currentRole: role },
        organizationId,
        role,
      };

      return await handler(req, ctx, params);
    } catch (error) {
      console.error("[withAuth] Error:", error);
      return apiError("INTERNAL_ERROR", "Internal server error", 500);
    }
  };
}

export function withAuthOnly(
  handler: (req: NextRequest, userId: string) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const token = getTokenFromRequest(req);
      if (!token) return apiError("UNAUTHORIZED", "Authentication required", 401);

      const payload = await verifyToken(token);
      if (!payload?.userId) return apiError("UNAUTHORIZED", "Invalid or expired token", 401);

      return await handler(req, payload.userId);
    } catch (error) {
      return apiError("INTERNAL_ERROR", "Internal server error", 500);
    }
  };
}

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(error: string, message: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error, message }, { status });
}

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
