// src/app/api/v1/organizations/[orgId]/call-logs/[id]/route.ts
import { NextRequest } from "next/server";
import { withAuth, apiSuccess, apiError, getClientIp } from "@/lib/middleware";
import { CallLogService } from "@/services/callLog.service";
import { UpdateCallLogSchema } from "@/lib/validation";

// GET /api/v1/organizations/:orgId/call-logs/:id
export const GET = withAuth(async (_req, ctx, params) => {
  const callLog = await CallLogService.getById(params!.id, ctx.organizationId);
  if (!callLog) return apiError("NOT_FOUND", "Call log not found", 404);

  // Guests can only see records imported by themselves
  if (ctx.role === "GUEST" && callLog.importedById !== ctx.user.id) {
    return apiError("FORBIDDEN", "Access denied", 403);
  }

  return apiSuccess(callLog);
});

// PATCH /api/v1/organizations/:orgId/call-logs/:id
export const PATCH = withAuth(async (req, ctx, params) => {
  if (ctx.role === "GUEST") {
    return apiError("FORBIDDEN", "Guests cannot edit call logs", 403);
  }

  const body = await req.json();
  const parsed = UpdateCallLogSchema.safeParse(body);

  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid input", 400);
  }

  try {
    const updated = await CallLogService.update(
      params!.id,
      ctx.organizationId,
      ctx.user.id,
      parsed.data,
      getClientIp(req)
    );
    return apiSuccess(updated);
  } catch (error: any) {
    return apiError("NOT_FOUND", error.message, 404);
  }
}, "MEMBER");

// DELETE /api/v1/organizations/:orgId/call-logs/:id
export const DELETE = withAuth(async (req, ctx, params) => {
  if (ctx.role === "GUEST" || ctx.role === "MEMBER") {
    return apiError("FORBIDDEN", "Only Admins and Owners can delete call logs", 403);
  }

  await CallLogService.softDelete(
    params!.id,
    ctx.organizationId,
    ctx.user.id,
    getClientIp(req)
  );

  return apiSuccess({ deleted: true });
}, "ADMIN");
