// src/app/api/v1/organizations/[orgId]/tags/route.ts
import { NextRequest } from "next/server";
import { withAuth, apiSuccess, apiError } from "@/lib/middleware";
import prisma from "@/lib/prisma";
import { CreateTagSchema } from "@/lib/validation";
import { AuditService } from "@/services/audit.service";

// GET /api/v1/organizations/:orgId/tags
export const GET = withAuth(async (_req, ctx) => {
  const tags = await prisma.tag.findMany({
    where: { organizationId: ctx.organizationId },
    include: { _count: { select: { callLogs: true } } },
    orderBy: { name: "asc" },
  });
  return apiSuccess(tags);
});

// POST /api/v1/organizations/:orgId/tags
export const POST = withAuth(async (req, ctx) => {
  const body = await req.json();
  const parsed = CreateTagSchema.safeParse(body);

  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid tag data", 400);
  }

  const existing = await prisma.tag.findUnique({
    where: {
      organizationId_name: {
        organizationId: ctx.organizationId,
        name: parsed.data.name,
      },
    },
  });

  if (existing) {
    return apiError("DUPLICATE", "A tag with this name already exists", 409);
  }

  const tag = await prisma.tag.create({
    data: {
      organizationId: ctx.organizationId,
      name: parsed.data.name,
      color: parsed.data.color,
    },
  });

  await AuditService.log({
    organizationId: ctx.organizationId,
    actorId: ctx.user.id,
    action: "tag_created",
    entityType: "tag",
    entityId: tag.id,
    metadata: { name: tag.name, color: tag.color },
  });

  return apiSuccess(tag, 201);
}, "MEMBER");
