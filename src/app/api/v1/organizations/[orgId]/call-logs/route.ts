// src/app/api/v1/organizations/[orgId]/call-logs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuth, apiSuccess, apiError } from "@/lib/middleware";
import { CallLogService } from "@/services/callLog.service";
import { CallLogFiltersSchema, CreateCallLogSchema } from "@/lib/validation";
import { getClientIp } from "@/lib/middleware";

// GET /api/v1/organizations/:orgId/call-logs
export const GET = withAuth(async (req, ctx) => {
  const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = CallLogFiltersSchema.safeParse(searchParams);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Guests can only see their own records
  const filters = parsed.data;
  if (ctx.role === "GUEST") {
    filters.userId = ctx.user.id;
  }

  const result = await CallLogService.list(ctx.organizationId, filters);
  return apiSuccess(result);
});

// POST /api/v1/organizations/:orgId/call-logs — manual entry
export const POST = withAuth(async (req, ctx) => {
  if (ctx.role === "GUEST") {
    return apiError("FORBIDDEN", "Guests cannot create call log entries", 403);
  }

  const body = await req.json();
  const parsed = CreateCallLogSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const callLog = await CallLogService.create(
    ctx.organizationId,
    ctx.user.id,
    parsed.data,
    getClientIp(req)
  );

  return apiSuccess(callLog, 201);
}, "MEMBER");
