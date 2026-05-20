// src/app/api/license/organizations/[orgId]/route.ts
import { withLicenseAuth, licenseApiSuccess, licenseApiError } from "@/lib/license-auth";
import prisma from "@/lib/prisma";

export const POST = withLicenseAuth(async (req) => {
  try {
    const urlParts = req.nextUrl.pathname.split("/");
    const orgId = urlParts[urlParts.length - 1];

    if (!orgId) {
      return licenseApiError("BAD_REQUEST", "Organization ID is required", 400);
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      return licenseApiError("NOT_FOUND", "Organization not found", 404);
    }

    const body = await req.json();
    const { action } = body;

    let updatedOrg;

    if (action === "block") {
      updatedOrg = await prisma.organization.update({
        where: { id: orgId },
        data: { status: "BLOCKED" },
      });
    } else if (action === "unblock") {
      updatedOrg = await prisma.organization.update({
        where: { id: orgId },
        data: { status: "ACTIVE" },
      });
    } else if (action === "changePlan") {
      const { planType } = body;
      if (planType !== "FREE_TRIAL" && planType !== "ACTIVE_PAID") {
        return licenseApiError("BAD_REQUEST", "Invalid plan type. Must be FREE_TRIAL or ACTIVE_PAID", 400);
      }
      updatedOrg = await prisma.organization.update({
        where: { id: orgId },
        data: { planType },
      });
    } else if (action === "extend") {
      const { days, endDate } = body;
      let newDate: Date;

      if (endDate) {
        newDate = new Date(endDate);
        if (isNaN(newDate.getTime())) {
          return licenseApiError("BAD_REQUEST", "Invalid end date format", 400);
        }
      } else if (typeof days === "number") {
        const baseDate = org.subscriptionEndDate && org.subscriptionEndDate > new Date()
          ? new Date(org.subscriptionEndDate)
          : new Date();
        baseDate.setDate(baseDate.getDate() + days);
        newDate = baseDate;
      } else {
        return licenseApiError("BAD_REQUEST", "Either days or endDate is required for extend action", 400);
      }

      updatedOrg = await prisma.organization.update({
        where: { id: orgId },
        data: { subscriptionEndDate: newDate },
      });
    } else {
      return licenseApiError("BAD_REQUEST", `Unsupported action: ${action}`, 400);
    }

    return licenseApiSuccess(updatedOrg);
  } catch (error) {
    console.error("[POST /api/license/organizations/[orgId]] error:", error);
    return licenseApiError("INTERNAL_ERROR", "Server error updating organization", 500);
  }
});
