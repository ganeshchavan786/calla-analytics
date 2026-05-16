// src/app/api/v1/organizations/[orgId]/tasks/[id]/route.ts
import { NextRequest } from "next/server";
import { withAuth, apiSuccess, apiError, getClientIp } from "@/lib/middleware";
import { TaskService } from "@/services/task.service";
import { UpdateTaskSchema } from "@/lib/validation";

export const GET = withAuth(async (_req, ctx, params) => {
  const task = await TaskService.getById(params!.id, ctx.organizationId);
  if (!task) return apiError("NOT_FOUND", "Task not found", 404);

  if (ctx.role === "GUEST" && task.assigneeId !== ctx.user.id) {
    return apiError("FORBIDDEN", "Access denied", 403);
  }

  return apiSuccess(task);
});

export const PATCH = withAuth(async (req, ctx, params) => {
  if (ctx.role === "GUEST") {
    return apiError("FORBIDDEN", "Guests cannot edit tasks", 403);
  }

  const body = await req.json();
  const parsed = UpdateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid input", 400);
  }

  try {
    const updated = await TaskService.update(
      params!.id,
      ctx.organizationId,
      ctx.user.id,
      parsed.data,
      getClientIp(req)
    );
    return apiSuccess(updated);
  } catch (e: any) {
    return apiError("NOT_FOUND", e.message, 404);
  }
}, "MEMBER");

export const DELETE = withAuth(async (_req, ctx, params) => {
  await TaskService.softDelete(params!.id, ctx.organizationId, ctx.user.id);
  return apiSuccess({ deleted: true });
}, "MEMBER");
