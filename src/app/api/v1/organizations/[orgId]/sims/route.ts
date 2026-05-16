// =====================================================
// FILE: src/app/api/v1/organizations/[orgId]/sims/route.ts (NEW FILE)
// ACTION: नवीन file बनवा
// PURPOSE: Owner → सर्व Employees च्या SIM status पाहणे
// =====================================================

import { NextRequest } from "next/server";
import { withAuth, apiSuccess, apiError } from "@/lib/middleware";
import { SimService } from "@/services/sim.service";

// GET /api/v1/organizations/:orgId/sims
export const GET = withAuth(async (_req, ctx) => {
  // Guest ला access नाही
  if (ctx.role === "GUEST") {
    return apiError("FORBIDDEN", "Access denied", 403);
  }

  // Member ला फक्त स्वतःचे SIMs दिसतील
  if (ctx.role === "MEMBER") {
    const sims = await SimService.getUserSIMs(ctx.user.id);
    return apiSuccess(sims);
  }

  // Owner / Admin ला सर्व employees चे SIMs दिसतील
  const allSIMs = await SimService.getOrganizationSIMs(ctx.organizationId);
  return apiSuccess(allSIMs);
});
