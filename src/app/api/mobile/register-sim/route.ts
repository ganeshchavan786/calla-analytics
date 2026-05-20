// =====================================================
// FILE: src/app/api/mobile/register-sim/route.ts  (NEW FILE)
// ACTION: नवीन file बनवा
// PURPOSE: Mobile App → SIM 1 / SIM 2 register करा
// =====================================================

import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { SimService } from "@/services/sim.service";
import { AuditService } from "@/services/audit.service";
import prisma from "@/lib/prisma";
import { z } from "zod";

const RegisterSIMSchema = z.object({
  simSlot: z.enum(["SIM_1", "SIM_2"]),
  phoneNumber: z.string().min(7).max(20),
  deviceName: z.string().max(200).optional(),
  deviceId: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // ─── Auth check ───
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "Login required" },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "Invalid token" },
        { status: 401 }
      );
    }

    // ─── Input validate ───
    const body = await req.json();
    const parsed = RegisterSIMSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { simSlot, phoneNumber, deviceName, deviceId } = parsed.data;

    // ─── Organization मिळवा ───
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: payload.userId },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: "NO_ORGANIZATION", message: "Organization नाही" },
        { status: 403 }
      );
    }

    const organization = await prisma.organization.findUnique({
      where: { id: membership.organizationId },
      select: { id: true, name: true, status: true, planType: true, subscriptionEndDate: true },
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, error: "NOT_FOUND", message: "Organization not found" },
        { status: 404 }
      );
    }

    // ─── Subscription & Block Check ───
    if (organization.status === "BLOCKED" || organization.status === "SUSPENDED") {
      return NextResponse.json(
        {
          success: false,
          error: "ORGANIZATION_BLOCKED",
          message: "Your organization has been suspended. Please contact support.",
        },
        { status: 403 }
      );
    }

    if (organization.subscriptionEndDate && organization.subscriptionEndDate < new Date()) {
      const message = organization.planType === "FREE_TRIAL"
        ? "Your 7-day free trial has expired. Please buy the Enterprise Plan to continue."
        : "Your subscription has expired. Please renew the Enterprise Plan to continue.";
      return NextResponse.json(
        {
          success: false,
          error: "SUBSCRIPTION_EXPIRED",
          message,
        },
        { status: 402 }
      );
    }

    // ─── SIM Register करा ───
    const sim = await SimService.registerSIM(
      payload.userId,
      membership.organizationId,
      simSlot,
      phoneNumber,
      deviceName,
      deviceId
    );

    // ─── Audit log ───
    await AuditService.log({
      organizationId: membership.organizationId,
      actorId: payload.userId,
      action: "call_imported", // reuse existing action
      entityType: "user",
      entityId: payload.userId,
      metadata: { event: "sim_registered", simSlot, phoneNumber, deviceName, deviceId },
    });

    return NextResponse.json({
      success: true,
      data: sim,
      message: `${simSlot.replace("_", " ")} successfully registered`,
    });

  } catch (error) {
    console.error("[POST /api/mobile/register-sim]", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: "Server error" },
      { status: 500 }
    );
  }
}

// ─── GET: User च्या registered SIMs list ───
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

    const sims = await SimService.getUserSIMs(payload.userId);

    return NextResponse.json({ success: true, data: sims });

  } catch (error) {
    return NextResponse.json({ success: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
