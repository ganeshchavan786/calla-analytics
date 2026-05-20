// src/app/api/license/organizations/route.ts
import { withLicenseAuth, licenseApiSuccess, licenseApiError } from "@/lib/license-auth";
import prisma from "@/lib/prisma";

export const GET = withLicenseAuth(async (req) => {
  try {
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
