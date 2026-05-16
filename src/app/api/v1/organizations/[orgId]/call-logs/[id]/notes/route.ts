// src/app/api/v1/organizations/[orgId]/call-logs/[id]/notes/route.ts
import { NextRequest } from "next/server";
import { withAuth, apiSuccess, apiError } from "@/lib/middleware";
import { CallLogService } from "@/services/callLog.service";
import { CreateNoteSchema } from "@/lib/validation";

// GET /api/v1/organizations/:orgId/call-logs/:id/notes
export const GET = withAuth(async (_req, ctx, params) => {
  const callLog = await CallLogService.getById(params!.id, ctx.organizationId);
  if (!callLog) return apiError("NOT_FOUND", "Call log not found", 404);
  return apiSuccess(callLog.notes);
});

// POST /api/v1/organizations/:orgId/call-logs/:id/notes
export const POST = withAuth(async (req, ctx, params) => {
  const body = await req.json();
  const parsed = CreateNoteSchema.safeParse(body);

  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Note content is required", 400);
  }

  try {
    const note = await CallLogService.addNote(
      params!.id,
      ctx.organizationId,
      ctx.user.id,
      parsed.data.content
    );
    return apiSuccess(note, 201);
  } catch (error: any) {
    return apiError("ERROR", error.message, 400);
  }
}, "MEMBER");
