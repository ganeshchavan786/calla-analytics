// src/app/api/v1/organizations/[orgId]/audit-logs/route.ts
import { NextRequest } from "next/server";
import { withAuth, apiSuccess, apiError } from "@/lib/middleware";
import { AuditService } from "@/services/audit.service";

// GET /api/v1/organizations/:orgId/audit-logs
export const GET = withAuth(async (req, ctx) => {
  // Only admins and owners can view full audit log
  if (ctx.role === "MEMBER" || ctx.role === "GUEST") {
    return apiError("FORBIDDEN", "Only Admins and Owners can view audit logs", 403);
  }

  const sp = req.nextUrl.searchParams;
  const result = await AuditService.getForOrganization(ctx.organizationId, {
    entityType: sp.get("entityType") ?? undefined,
    entityId: sp.get("entityId") ?? undefined,
    actorId: sp.get("actorId") ?? undefined,
    cursor: sp.get("cursor") ?? undefined,
    limit: parseInt(sp.get("limit") ?? "50"),
  });

  return apiSuccess(result);
}, "ADMIN");
