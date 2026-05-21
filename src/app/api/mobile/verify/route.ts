// ================================================
// FILE: src/app/api/mobile/verify/route.ts
// ACTION: Fully replace EXISTING file
// CHANGE: 
//   1. Embed organizationId + role in JWT
//   2. Add identity, organization, registeredSIMs, syncConfig in response
// ================================================

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, signToken } from "@/lib/auth";
import { z } from "zod";

const VerifySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  uniqueCode: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = VerifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Email, password, and uniqueCode are required",
        },
        { status: 400 }
      );
    }

    const { email, password, uniqueCode } = parsed.data;

    // ── Step 1: Find User ──
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        passwordHash: true,
        uniqueCode: true,
        codeType: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
        { status: 401 }
      );
    }

    // ── Step 2: Verify Password ──
    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
        { status: 401 }
      );
    }

    // ── Step 3: Verify Unique Code ──
    if (!user.uniqueCode || user.uniqueCode !== uniqueCode) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_CODE",
          message: "Invalid unique code. Please use the correct code from the dashboard.",
        },
        { status: 401 }
      );
    }

    // ── Step 4: Get Organization + Role ──
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            timezone: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    if (!membership) {
      return NextResponse.json(
        {
          success: false,
          error: "NO_ORGANIZATION",
          message: "User is not linked to any organization",
        },
        { status: 403 }
      );
    }

    // ── Step 5: Get Registered SIMs ──
    const registeredSIMs = await prisma.registeredSIM.findMany({
      where: { userId: user.id },
      select: {
        simSlot: true,
        phoneNumber: true,
        deviceName: true,
        isActive: true,
        lastSyncAt: true,
        totalSynced: true,
      },
      orderBy: { simSlot: "asc" },
    });

    // ── Step 6: Embed organizationId + role in JWT Token ──
    // This is key — since the token contains organization info,
    // the organization is automatically identified in every sync request
    const token = await signToken({
      userId: user.id,
      email: user.email,
      organizationId: membership.organization.id,  // ← NEW
      role: membership.role,                        // ← NEW
    });

    // ── Step 7: Build Professional Response ──
    return NextResponse.json({
      success: true,

      // Token — to be securely saved by the Mobile App
      token,

      // Logged in identity
      identity: {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        avatarUrl: user.avatarUrl,
        uniqueCode: user.uniqueCode,
        codeType: user.codeType,  // "OWNER" | "EMPLOYEE"
      },

      // Organization details
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        logoUrl: membership.organization.logoUrl,
        timezone: membership.organization.timezone,
        role: membership.role,  // "OWNER" | "ADMIN" | "MEMBER" | "GUEST"
      },

      // Employee's registered SIMs
      // The App should save these locally
      registeredSIMs: registeredSIMs.map((sim) => ({
        simSlot: sim.simSlot,           // "SIM_1" | "SIM_2"
        phoneNumber: sim.phoneNumber,   // "+919876543210" — SIM's own number
        deviceName: sim.deviceName,
        isActive: sim.isActive,
        lastSyncAt: sim.lastSyncAt,
        totalSynced: sim.totalSynced,
      })),

      // Sync settings — to be followed by the App
      syncConfig: {
        maxRecordsPerSync: 5000,
        syncIntervalMinutes: 60,
        allowedSIMSlots: ["SIM_1", "SIM_2"],
        apiVersion: "v1",
      },
    });

  } catch (error) {
    console.error("[POST /api/mobile/verify]", error);
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Server error — please try again",
      },
      { status: 500 }
    );
  }
}
