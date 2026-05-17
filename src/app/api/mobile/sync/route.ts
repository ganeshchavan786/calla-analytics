// ================================================
// FILE: src/app/api/mobile/sync/route.ts
// ACTION: EXISTING file पूर्ण replace करा
// CHANGE:
//   1. organizationId token वरून घेतो (request मधून नाही)
//   2. SIM चा स्वतःचा number RegisteredSIM वरून join
//   3. Response मध्ये ownership summary add केले
// ================================================

import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { CallLogService } from "@/services/callLog.service";
import { SimService } from "@/services/sim.service";
import { NotificationService } from "@/services/notification.service";
import prisma from "@/lib/prisma";
import { z } from "zod";

const CallRecordSchema = z.object({
  mobileNumber: z.string().min(7).max(20),
  contactName: z.string().max(200).optional().nullable(),
  callType: z.enum(["INCOMING", "OUTGOING", "MISSED"]),
  date: z.string().datetime(),
  duration: z.number().int().min(0).default(0),
  simSlot: z.enum(["SIM_1", "SIM_2", "UNKNOWN"]).default("UNKNOWN"),
  deviceName: z.string().max(200).optional().nullable(),
  recordingLink: z.string().url().optional().nullable(),
});

const SyncSchema = z.object({
  records: z.array(CallRecordSchema).min(1).max(5000),
  simSlot: z.enum(["SIM_1", "SIM_2", "UNKNOWN"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // ── Step 1: Token verify ──
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

    // ── Step 2: organizationId TOKEN वरून घ्या ──
    // App ला request मध्ये orgId पाठवायची गरज नाही
    // Token मध्येच embed आहे — secure आहे
    let organizationId = payload.organizationId;

    if (!organizationId) {
      // Fallback: DB वरून घ्या (old tokens साठी)
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
      organizationId = membership.organizationId;
    }

    // ── Step 3: Input validate ──
    const body = await req.json();
    const parsed = SyncSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Invalid records format",
          issues: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { records, simSlot } = parsed.data;

    // ── Step 4: Employee + Organization info confirm ──
    const [employee, organization] = await Promise.all([
      prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true, name: true, email: true,
          uniqueCode: true, codeType: true,
        },
      }),
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true },
      }),
    ]);

    if (!employee || !organization) {
      return NextResponse.json(
        { success: false, error: "NOT_FOUND", message: "User or Organization not found" },
        { status: 404 }
      );
    }

    // ── Step 5: SIM चा स्वतःचा number मिळवा ──
    // RegisteredSIM table वरून join करतो
    let simOwnNumber: string | null = null;
    let simDeviceName: string | null = null;

    if (simSlot && simSlot !== "UNKNOWN") {
      const registeredSIM = await prisma.registeredSIM.findUnique({
        where: {
          userId_simSlot: {
            userId: payload.userId,
            simSlot: simSlot,
          },
        },
        select: { phoneNumber: true, deviceName: true },
      });
      simOwnNumber = registeredSIM?.phoneNumber ?? null;
      simDeviceName = registeredSIM?.deviceName ?? null;
    }

    // ── Step 6: Import Batch बनवा ──
    const batch = await prisma.importBatch.create({
      data: {
        organizationId,
        importedById: payload.userId,
        source: "MOBILE_SYNC",
        status: "PROCESSING",
        totalRows: records.length,
        startedAt: new Date(),
      },
    });

    // ── Step 7: Bulk insert ──
    const { successCount, failCount } = await CallLogService.bulkCreate(
      organizationId,
      payload.userId,
      batch.id,
      records.map((r) => ({
        ...r,
        contactName: r.contactName || undefined,
        deviceName: r.deviceName || undefined,
        recordingLink: r.recordingLink || undefined,
        date: new Date(r.date),
        simSlot: r.simSlot ?? "UNKNOWN",
      }))
    );

    // ── Step 8: Batch update ──
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        successRows: successCount,
        failedRows: failCount,
      },
    });

    // ── Step 9: SIM lastSyncAt update ──
    if (simSlot && simSlot !== "UNKNOWN") {
      await SimService.updateLastSync(payload.userId, simSlot, successCount);
    }

    // ── Step 10: Missed calls notification ──
    const missedCalls = records.filter((r) => r.callType === "MISSED");
    if (missedCalls.length > 0) {
      const admins = await prisma.organizationMember.findMany({
        where: {
          organizationId,
          role: { in: ["OWNER", "ADMIN"] },
          NOT: { userId: payload.userId },
        },
        select: { userId: true },
      });

      if (admins.length > 0) {
        await NotificationService.createForMany(
          admins.map((a) => a.userId),
          {
            organizationId,
            type: "MISSED_CALL",
            title: "Missed Calls Synced",
            body: `${employee.name} च्या ${simSlot?.replace("_", " ") || "SIM"} वरून ${missedCalls.length} missed call${missedCalls.length > 1 ? "s" : ""} sync झाले`,
            link: "/call-logs?callType=MISSED",
          }
        );
      }
    }

    // ── Step 11: Professional Response ──
    return NextResponse.json({
      success: true,

      // Sync result
      sync: {
        batchId: batch.id,
        totalRows: records.length,
        successRows: successCount,
        failedRows: failCount,
        syncedAt: new Date().toISOString(),
      },

      // Data ownership — server ने confirm केले
      ownership: {
        organization: {
          id: organization.id,
          name: organization.name,
        },
        employee: {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          uniqueCode: employee.uniqueCode,
          codeType: employee.codeType,
        },
        sim: {
          slot: simSlot ?? "UNKNOWN",
          ownNumber: simOwnNumber,      // SIM चा स्वतःचा number
          deviceName: simDeviceName,
        },
      },

      message: `${successCount} records successfully synced`,
    });

  } catch (error) {
    console.error("[POST /api/mobile/sync]", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: "Sync failed" },
      { status: 500 }
    );
  }
}
