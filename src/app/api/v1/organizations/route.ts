// src/app/api/v1/organizations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuthOnly } from "@/lib/middleware";
import { OrganizationService } from "@/services/organization.service";
import { CreateOrganizationSchema } from "@/lib/validation";

// GET /api/v1/organizations — list user's orgs
export const GET = withAuthOnly(async (_req, userId) => {
  const orgs = await OrganizationService.getForUser(userId);
  return NextResponse.json({ success: true, data: orgs });
});

// POST /api/v1/organizations — create new org
export const POST = withAuthOnly(async (req, userId) => {
  const body = await req.json();
  const parsed = CreateOrganizationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const org = await OrganizationService.create(userId, parsed.data.name, parsed.data.timezone);
  return NextResponse.json({ success: true, data: org }, { status: 201 });
});
