// src/app/api/v1/organizations/[orgId]/tasks/[id]/comments/route.ts
import { NextRequest } from "next/server";
import { withAuth, apiSuccess, apiError } from "@/lib/middleware";
import { TaskService } from "@/services/task.service";
import { CreateTaskCommentSchema } from "@/lib/validation";

export const POST = withAuth(async (req, ctx, params) => {
  const body = await req.json();
  const parsed = CreateTaskCommentSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Comment content is required", 400);
  }

  try {
    const comment = await TaskService.addComment(
      params!.id,
      ctx.organizationId,
      ctx.user.id,
      parsed.data.content
    );
    return apiSuccess(comment, 201);
  } catch (e: any) {
    return apiError("ERROR", e.message, 400);
  }
}, "MEMBER");
