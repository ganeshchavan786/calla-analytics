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
    deviceName?: string
  ) {
    // Already registered आहे का check करा
    const existing = await prisma.registeredSIM.findUnique({
      where: { userId_simSlot: { userId, simSlot } },
    });

    if (existing) {
      // Update करा — phone number बदलला असेल
      return prisma.registeredSIM.update({
        where: { userId_simSlot: { userId, simSlot } },
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
    syncedCount: number
  ) {
    await prisma.registeredSIM.updateMany({
      where: { userId, simSlot },
      data: {
        lastSyncAt: new Date(),
        totalSynced: { increment: syncedCount },
      },
    });
  }

  // ─────────────────────────────────────────
  // SIM deactivate करा
  // ─────────────────────────────────────────
  static async deactivateSIM(userId: string, simSlot: string) {
    await prisma.registeredSIM.updateMany({
      where: { userId, simSlot },
      data: { isActive: false },
    });
  }
}
