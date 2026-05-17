// src/lib/license-cron.ts
// License Manager Cron Jobs
// Import this in src/app/api/license/cron/init.ts to start

import prisma from "./prisma";
import { sendDailyReportEmail } from "./license-smtp";

// =============================================================
// COLLECT STATS FOR DAILY REPORT
// =============================================================

async function collectDailyStats() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    newUsersToday,
    totalOrganizations,
    newOrgsToday,
    totalCallLogs,
    callLogsSyncedToday,
    verifiedUsers,
    unverifiedUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.organization.count(),
    prisma.organization.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.callLog.count({ where: { deletedAt: null } }),
    prisma.callLog.count({ where: { deletedAt: null, createdAt: { gte: todayStart } } }),
    prisma.user.count({ where: { isVerified: true } }),
    prisma.user.count({ where: { isVerified: false } }),
  ]);

  return {
    totalUsers,
    newUsersToday,
    totalOrganizations,
    newOrgsToday,
    totalCallLogs,
    callLogsSyncedToday,
    verifiedUsers,
    unverifiedUsers,
  };
}

// =============================================================
// JOB 1: DAILY REPORT
// =============================================================

export async function runDailyReport(): Promise<{ success: boolean; message: string }> {
  try {
    const settings = await prisma.licenseSettings.findFirst();
    if (!settings?.cronReportEnabled || !settings?.cronReportEmail) {
      return { success: false, message: "Daily report not configured or disabled" };
    }

    const stats = await collectDailyStats();
    await sendDailyReportEmail(stats);

    return {
      success: true,
      message: `Daily report sent to ${settings.cronReportEmail}`,
    };
  } catch (error: any) {
    console.error("[Cron] Daily report failed:", error.message);
    return { success: false, message: error.message };
  }
}

// =============================================================
// JOB 2: CLEANUP UNVERIFIED ACCOUNTS (older than 24 hours)
// =============================================================

export async function runVerificationCleanup(): Promise<{ success: boolean; deleted: number }> {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    const deleted = await prisma.user.deleteMany({
      where: {
        isVerified: false,
        createdAt: { lt: cutoff },
      },
    });

    console.log(`[Cron] Cleaned up ${deleted.count} unverified accounts`);
    return { success: true, deleted: deleted.count };
  } catch (error: any) {
    console.error("[Cron] Verification cleanup failed:", error.message);
    return { success: false, deleted: 0 };
  }
}

// =============================================================
// JOB 3: CLEANUP EXPIRED RESET TOKENS
// =============================================================

export async function runResetTokenCleanup(): Promise<{ success: boolean; cleared: number }> {
  try {
    const cleared = await prisma.user.updateMany({
      where: {
        resetTokenExpiry: { lt: new Date() },
        resetToken: { not: null },
      },
      data: {
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    console.log(`[Cron] Cleared ${cleared.count} expired reset tokens`);
    return { success: true, cleared: cleared.count };
  } catch (error: any) {
    console.error("[Cron] Reset token cleanup failed:", error.message);
    return { success: false, cleared: 0 };
  }
}

// =============================================================
// START ALL CRON JOBS (call this from app startup)
// =============================================================

let cronStarted = false;

export async function startCronJobs(): Promise<void> {
  if (cronStarted) return;
  cronStarted = true;

  try {
    const nodeCron = await import("node-cron");
    const settings = await prisma.licenseSettings.findFirst();

    // Parse cron time from settings (HH:MM format)
    const reportTime = settings?.cronReportTime || "09:00";
    const [hour, minute] = reportTime.split(":").map(Number);

    // Daily Report — at configured time
    nodeCron.default.schedule(`${minute} ${hour} * * *`, async () => {
      console.log("[Cron] Running daily report...");
      await runDailyReport();
    });

    // Verification Cleanup — every 6 hours
    nodeCron.default.schedule("0 */6 * * *", async () => {
      console.log("[Cron] Running verification cleanup...");
      await runVerificationCleanup();
    });

    // Reset Token Cleanup — every hour
    nodeCron.default.schedule("0 * * * *", async () => {
      await runResetTokenCleanup();
    });

    console.log(`✅ Cron jobs started. Daily report at ${reportTime}`);
  } catch (error: any) {
    console.error("[Cron] Failed to start:", error.message);
    console.log("💡 Install node-cron: npm install node-cron @types/node-cron");
  }
}
