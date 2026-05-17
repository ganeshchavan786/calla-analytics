// src/app/api/license/users/route.ts
import { withLicenseAuth, licenseApiSuccess } from "@/lib/license-auth";
import prisma from "@/lib/prisma";

export const GET = withLicenseAuth(async (req) => {
  const sp = req.nextUrl.searchParams;
  const filter = sp.get("filter") || "all"; // all | verified | unverified
  const search = sp.get("search") || "";
  const limit = parseInt(sp.get("limit") || "50");
  const cursor = sp.get("cursor") || undefined;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const where: any = {
    ...(filter === "verified" ? { isVerified: true } : {}),
    ...(filter === "unverified" ? { isVerified: false } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {}),
  };

  const [users, total, todayCount, weekCount, verifiedCount, unverifiedCount] =
    await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true,
          isVerified: true, createdAt: true,
          uniqueCode: true, codeType: true,
          memberships: {
            select: {
              role: true,
              organization: { select: { id: true, name: true } },
            },
            take: 1,
          },
          _count: { select: { importedLogs: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      }),
      prisma.user.count({ where }),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.user.count({ where: { isVerified: true } }),
      prisma.user.count({ where: { isVerified: false } }),
    ]);

  const hasMore = users.length > limit;
  const data = hasMore ? users.slice(0, limit) : users;

  return licenseApiSuccess({
    users: data,
    stats: { total, todayCount, weekCount, verifiedCount, unverifiedCount },
    nextCursor: hasMore ? data[data.length - 1].id : null,
    hasMore,
  });
});
