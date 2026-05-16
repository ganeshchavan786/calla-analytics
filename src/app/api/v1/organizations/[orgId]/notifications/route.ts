// src/app/api/v1/organizations/[orgId]/notifications/route.ts
import { NextRequest } from "next/server";
import { withAuth, apiSuccess } from "@/lib/middleware";
import { NotificationService } from "@/services/notification.service";

// GET /api/v1/organizations/:orgId/notifications
export const GET = withAuth(async (req, ctx) => {
  const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "25");

  const result = await NotificationService.getForUser(
    ctx.user.id,
    ctx.organizationId,
    { cursor, limit }
  );
  return apiSuccess(result);
});

// PATCH /api/v1/organizations/:orgId/notifications — mark all read
export const PATCH = withAuth(async (req, ctx) => {
  const body = await req.json().catch(() => ({}));

  if (body.id) {
    await NotificationService.markAsRead(body.id, ctx.user.id);
  } else {
    await NotificationService.markAllAsRead(ctx.user.id, ctx.organizationId);
  }

  return apiSuccess({ updated: true });
});
