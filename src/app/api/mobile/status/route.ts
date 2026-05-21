// =====================================================
// FILE: src/app/api/mobile/status/route.ts  (NEW FILE)
// ACTION: Create new file
// PURPOSE: Mobile App → Check sync status
// =====================================================

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { SimService } from "@/services/sim.service";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // ─── Auth check ───
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    // ─── User info ───
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, email: true, uniqueCode: true, codeType: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "USER_NOT_FOUND" }, { status: 404 });
    }

    // ─── Organization ───
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: payload.userId },
      include: {
        organization: { select: { id: true, name: true } },
      },
    });

    // ─── Registered SIMs ───
    const sims = await SimService.getUserSIMs(payload.userId);

    // ─── Last sync batch ───
    const lastBatch = await prisma.importBatch.findFirst({
      where: {
        importedById: payload.userId,
        source: "MOBILE_SYNC",
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, status: true, successRows: true,
        failedRows: true, completedAt: true, createdAt: true,
      },
    });

    // ─── Total synced count ───
    const totalSynced = await prisma.callLog.count({
      where: { importedById: payload.userId },
    });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          uniqueCode: user.uniqueCode,
          codeType: user.codeType,
        },
        organization: membership
          ? { id: membership.organization.id, name: membership.organization.name, role: membership.role }
          : null,
        sims: sims.map((s) => ({
          simSlot: s.simSlot,
          phoneNumber: s.phoneNumber,
          deviceName: s.deviceName,
          isActive: s.isActive,
          lastSyncAt: s.lastSyncAt,
          totalSynced: s.totalSynced,
        })),
        lastSync: lastBatch ?? null,
        totalCallLogsSynced: totalSynced,
      },
    });

  } catch (error) {
    console.error("[GET /api/mobile/status]", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
