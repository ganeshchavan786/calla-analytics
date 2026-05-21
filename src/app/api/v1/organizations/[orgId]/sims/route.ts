// =====================================================
// FILE: src/app/api/v1/organizations/[orgId]/sims/route.ts (NEW FILE)
// ACTION: Create new file
// PURPOSE: Owner → View SIM status of all employees
// =====================================================

import { NextRequest } from "next/server";
import { withAuth, apiSuccess, apiError } from "@/lib/middleware";
import { SimService } from "@/services/sim.service";

// GET /api/v1/organizations/:orgId/sims
export const GET = withAuth(async (_req, ctx) => {
  // No access for Guest
  if (ctx.role === "GUEST") {
    return apiError("FORBIDDEN", "Access denied", 403);
  }

  // Member will only see their own SIMs
  if (ctx.role === "MEMBER") {
    const sims = await SimService.getUserSIMs(ctx.user.id);
    return apiSuccess(sims);
  }

  // Owner / Admin will see all employees' SIMs
  const allSIMs = await SimService.getOrganizationSIMs(ctx.organizationId);
  return apiSuccess(allSIMs);
});
