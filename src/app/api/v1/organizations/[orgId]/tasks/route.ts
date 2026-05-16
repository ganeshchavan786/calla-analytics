// src/app/api/v1/organizations/[orgId]/tasks/route.ts
import { NextRequest } from "next/server";
import { withAuth, apiSuccess, apiError, getClientIp } from "@/lib/middleware";
import { TaskService } from "@/services/task.service";
import { CreateTaskSchema } from "@/lib/validation";

// GET /api/v1/organizations/:orgId/tasks
export const GET = withAuth(async (req, ctx) => {
  const sp = req.nextUrl.searchParams;
  const options: any = {
    cursor: sp.get("cursor") ?? undefined,
    limit: parseInt(sp.get("limit") ?? "25"),
    status: sp.get("status") ?? undefined,
    priority: sp.get("priority") ?? undefined,
    assigneeId: sp.get("assigneeId") ?? undefined,
    linkedCallId: sp.get("linkedCallId") ?? undefined,
  };

  // Guests see only their assigned tasks
  if (ctx.role === "GUEST") {
    options.assigneeId = ctx.user.id;
  }

  // Special: kanban view
  if (sp.get("view") === "kanban") {
    const board = await TaskService.getKanbanBoard(ctx.organizationId);
    return apiSuccess(board);
  }

  const result = await TaskService.list(ctx.organizationId, options);
  return apiSuccess(result);
});

// POST /api/v1/organizations/:orgId/tasks
export const POST = withAuth(async (req, ctx) => {
  if (ctx.role === "GUEST") {
    return apiError("FORBIDDEN", "Guests cannot create tasks", 403);
  }

  const body = await req.json();
  const parsed = CreateTaskSchema.safeParse(body);

  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid input", 400);
  }

  const task = await TaskService.create(
    ctx.organizationId,
    ctx.user.id,
    parsed.data,
    getClientIp(req)
  );
  return apiSuccess(task, 201);
}, "MEMBER");
