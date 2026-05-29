// src/app/api/v1/organizations/[orgId]/members/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuth, apiSuccess, apiError, canInviteMembers } from "@/lib/middleware";
import { OrganizationService } from "@/services/organization.service";
import { InviteMemberSchema } from "@/lib/validation";

// GET /api/v1/organizations/:orgId/members
export const GET = withAuth(async (_req, ctx) => {
  const members = await OrganizationService.getMembers(ctx.organizationId);
  return apiSuccess(members);
}, undefined, { allowExpired: true });

// POST /api/v1/organizations/:orgId/members — invite member
export const POST = withAuth(async (req, ctx) => {
  if (!canInviteMembers(ctx.role)) {
    return apiError("FORBIDDEN", "Only Admins and Owners can invite members", 403);
  }

  const body = await req.json();
  const parsed = InviteMemberSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const invite = await OrganizationService.createInvite(
      ctx.organizationId,
      ctx.user.id,
      parsed.data.email,
      parsed.data.role
    );
    return apiSuccess(invite, 201);
  } catch (error: any) {
    return apiError("INVITE_ERROR", error.message, 400);
  }
}, "ADMIN");
