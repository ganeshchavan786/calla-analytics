// src/app/api/v1/auth/me/route.ts — FINAL

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true, name: true, email: true,
        avatarUrl: true, createdAt: true,
        uniqueCode: true, codeType: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "USER_NOT_FOUND" }, { status: 404 });
    }

    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            timezone: true,
            status: true,
            planType: true,
            subscriptionEndDate: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    // Registered SIMs
    const sims = await prisma.registeredSIM.findMany({
      where: { userId: user.id },
      select: {
        simSlot: true, phoneNumber: true, deviceName: true,
        isActive: true, lastSyncAt: true, totalSynced: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        user,
        organizations: memberships.map((m) => ({
          ...m.organization,
          role: m.role,
          joinedAt: m.joinedAt,
        })),
        registeredSIMs: sims,
      },
    });
  } catch (error) {
    console.error("[GET /auth/me]", error);
    return NextResponse.json({ success: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
