// src/app/api/license/organizations/route.ts
import { withLicenseAuth, licenseApiSuccess, licenseApiError } from "@/lib/license-auth";
import prisma from "@/lib/prisma";

export const GET = withLicenseAuth(async (req) => {
  try {
    // Auto-fix: If any FREE_TRIAL org has null subscriptionEndDate, set it to createdAt + 7 days
    const nullEndDateOrgs = await prisma.organization.findMany({
      where: { planType: "FREE_TRIAL", subscriptionEndDate: null },
      select: { id: true, createdAt: true },
    });
    for (const org of nullEndDateOrgs) {
      const endDate = new Date(org.createdAt);
      endDate.setDate(endDate.getDate() + 7);
      await prisma.organization.update({
        where: { id: org.id },
        data: { subscriptionEndDate: endDate },
      });
    }

    // Auto-block: If subscriptionEndDate has passed and org is still ACTIVE
    await prisma.organization.updateMany({
      where: {
        subscriptionEndDate: { lt: new Date() },
        status: "ACTIVE",
      },
      data: { status: "BLOCKED" },
    });

    const sp = req.nextUrl.searchParams;
    const search = sp.get("search") || "";
    const filter = sp.get("filter") || "all"; // all | active | blocked

    const where: any = {
      ...(filter === "active" ? { status: "ACTIVE" } : {}),
      ...(filter === "blocked" ? { status: "BLOCKED" } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { slug: { contains: search } },
            ],
          }
        : {}),
    };

    const orgs = await prisma.organization.findMany({
      where,
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                isVerified: true,
                createdAt: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            callLogs: true,
            registeredSIMs: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return licenseApiSuccess({ organizations: orgs });
  } catch (error) {
    console.error("[GET /api/license/organizations] error:", error);
    return licenseApiError("INTERNAL_ERROR", "Server error fetching organizations", 500);
  }
});
