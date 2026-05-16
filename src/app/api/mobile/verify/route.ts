// ================================================
// FILE: src/app/api/mobile/verify/route.ts
// ACTION: EXISTING file पूर्ण replace करा
// CHANGE: 
//   1. JWT मध्ये organizationId + role embed
//   2. Response मध्ये identity, organization, 
//      registeredSIMs, syncConfig add केले
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
          message: "email, password आणि uniqueCode required आहे",
        },
        { status: 400 }
      );
    }

    const { email, password, uniqueCode } = parsed.data;

    // ── Step 1: User शोधा ──
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
          message: "Email किंवा password चुकीचा आहे",
        },
        { status: 401 }
      );
    }

    // ── Step 2: Password verify ──
    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_CREDENTIALS",
          message: "Email किंवा password चुकीचा आहे",
        },
        { status: 401 }
      );
    }

    // ── Step 3: Unique Code verify ──
    if (!user.uniqueCode || user.uniqueCode !== uniqueCode) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_CODE",
          message: "Code चुकीचा आहे. Dashboard मधून correct code वापरा.",
        },
        { status: 401 }
      );
    }

    // ── Step 4: Organization + Role मिळवा ──
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
          message: "कोणत्याही organization शी linked नाही",
        },
        { status: 403 }
      );
    }

    // ── Step 5: Registered SIMs मिळवा ──
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

    // ── Step 6: JWT Token — organizationId + role EMBED करा ──
    // हे KEY आहे — token मध्ये org info असल्यामुळे
    // प्रत्येक sync request मध्ये org automatically identify होते
    const token = await signToken({
      userId: user.id,
      email: user.email,
      organizationId: membership.organization.id,  // ← NEW
      role: membership.role,                        // ← NEW
    });

    // ── Step 7: Professional Response build करा ──
    return NextResponse.json({
      success: true,

      // Token — Mobile App ने securely save करायचा
      token,

      // कोण login झाला
      identity: {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        avatarUrl: user.avatarUrl,
        uniqueCode: user.uniqueCode,
        codeType: user.codeType,  // "OWNER" | "EMPLOYEE"
      },

      // कोणत्या Organization चा आहे
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        logoUrl: membership.organization.logoUrl,
        timezone: membership.organization.timezone,
        role: membership.role,  // "OWNER" | "ADMIN" | "MEMBER" | "GUEST"
      },

      // Employee च्या registered SIMs
      // App ने हे locally save करायचे
      registeredSIMs: registeredSIMs.map((sim) => ({
        simSlot: sim.simSlot,           // "SIM_1" | "SIM_2"
        phoneNumber: sim.phoneNumber,   // "+919876543210" — SIM चा स्वतःचा number
        deviceName: sim.deviceName,
        isActive: sim.isActive,
        lastSyncAt: sim.lastSyncAt,
        totalSynced: sim.totalSynced,
      })),

      // Sync settings — App ने follow करायच्या
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
