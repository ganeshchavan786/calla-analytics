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

    const { simSlot, phoneNumber, deviceName } = parsed.data;

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

    // ─── SIM Register करा ───
    const sim = await SimService.registerSIM(
      payload.userId,
      membership.organizationId,
      simSlot,
      phoneNumber,
      deviceName
    );

    // ─── Audit log ───
    await AuditService.log({
      organizationId: membership.organizationId,
      actorId: payload.userId,
      action: "call_imported", // reuse existing action
      entityType: "user",
      entityId: payload.userId,
      metadata: { event: "sim_registered", simSlot, phoneNumber, deviceName },
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
