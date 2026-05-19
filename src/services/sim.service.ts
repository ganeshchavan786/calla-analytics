// =====================================================
// FILE: src/services/sim.service.ts  (NEW FILE)
// ACTION: नवीन file बनवा
// =====================================================

import prisma from "@/lib/prisma";

export class SimService {

  // ─────────────────────────────────────────
  // SIM Register करा (Mobile App वरून येईल)
  // ─────────────────────────────────────────
  static async registerSIM(
    userId: string,
    organizationId: string,
    simSlot: "SIM_1" | "SIM_2",
    phoneNumber: string,
    deviceName?: string,
    deviceId?: string
  ) {
    const dId = deviceId || "unknown";
    // Already registered आहे का check करा
    const existing = await prisma.registeredSIM.findUnique({
      where: {
        userId_deviceId_simSlot: {
          userId,
          deviceId: dId,
          simSlot,
        },
      },
    });

    if (existing) {
      // Update करा — phone number बदलला असेल
      return prisma.registeredSIM.update({
        where: {
          userId_deviceId_simSlot: {
            userId,
            deviceId: dId,
            simSlot,
          },
        },
        data: {
          phoneNumber,
          deviceName: deviceName ?? existing.deviceName,
          isActive: true,
          updatedAt: new Date(),
        },
      });
    }

    // नवीन register करा
    return prisma.registeredSIM.create({
      data: {
        userId,
        organizationId,
        simSlot,
        phoneNumber,
        deviceName: deviceName ?? null,
        deviceId: dId,
        isActive: true,
      },
    });
  }

  // ─────────────────────────────────────────
  // User च्या सर्व SIMs मिळवा
  // ─────────────────────────────────────────
  static async getUserSIMs(userId: string) {
    return prisma.registeredSIM.findMany({
      where: { userId },
      orderBy: { simSlot: "asc" },
    });
  }

  // ─────────────────────────────────────────
  // Organization च्या सर्व Members च्या SIMs
  // (Owner dashboard साठी)
  // ─────────────────────────────────────────
  static async getOrganizationSIMs(organizationId: string) {
    return prisma.registeredSIM.findMany({
      where: { organizationId },
      include: {
        user: {
          select: { id: true, name: true, email: true, uniqueCode: true, codeType: true },
        },
      },
      orderBy: [{ user: { name: "asc" } }, { simSlot: "asc" }],
    });
  }

  // ─────────────────────────────────────────
  // Sync झाल्यावर lastSyncAt update करा
  // ─────────────────────────────────────────
  static async updateLastSync(
    userId: string,
    simSlot: string,
    syncedCount: number,
    deviceId?: string
  ) {
    const dId = deviceId || "unknown";
    const actualCount = await prisma.callLog.count({
      where: { importedById: userId, simSlot, deletedAt: null }
    });

    await prisma.registeredSIM.updateMany({
      where: { userId, deviceId: dId, simSlot },
      data: {
        lastSyncAt: new Date(),
        totalSynced: actualCount,
      },
    });
  }

  // ─────────────────────────────────────────
  // SIM deactivate करा
  // ─────────────────────────────────────────
  static async deactivateSIM(userId: string, simSlot: string, deviceId?: string) {
    const dId = deviceId || "unknown";
    await prisma.registeredSIM.updateMany({
      where: { userId, deviceId: dId, simSlot },
      data: { isActive: false },
    });
  }
}
