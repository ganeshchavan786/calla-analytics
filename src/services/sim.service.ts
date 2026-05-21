// =====================================================
// FILE: src/services/sim.service.ts  (NEW FILE)
// ACTION: Create new file
// =====================================================

import prisma from "@/lib/prisma";

export class SimService {

  // ─────────────────────────────────────────
  // Register SIM (called from Mobile App)
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
    // Check if already registered
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
      // Update if phone number has changed
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

    // Register new SIM
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
  // Get all SIMs for a User
  // ─────────────────────────────────────────
  static async getUserSIMs(userId: string) {
    return prisma.registeredSIM.findMany({
      where: { userId },
      orderBy: { simSlot: "asc" },
    });
  }

  // ─────────────────────────────────────────
  // Get SIMs of all Members in the Organization
  // (For Owner dashboard)
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
  // Update lastSyncAt after synchronization
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
  // Deactivate SIM
  // ─────────────────────────────────────────
  static async deactivateSIM(userId: string, simSlot: string, deviceId?: string) {
    const dId = deviceId || "unknown";
    await prisma.registeredSIM.updateMany({
      where: { userId, deviceId: dId, simSlot },
      data: { isActive: false },
    });
  }
}
