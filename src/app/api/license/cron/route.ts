// src/app/api/license/cron/route.ts
import { withLicenseAuth, licenseApiSuccess, licenseApiError } from "@/lib/license-auth";
import {
  runDailyReport,
  runVerificationCleanup,
  runResetTokenCleanup,
} from "@/lib/license-cron";

// GET — cron job status
export const GET = withLicenseAuth(async () => {
  return licenseApiSuccess({
    jobs: [
      {
        name: "Daily Report Email",
        schedule: "Daily at configured time",
        description: "Sends daily stats email to cronReportEmail",
        canTriggerManually: true,
        action: "daily-report",
      },
      {
        name: "Verification Cleanup",
        schedule: "Every 6 hours",
        description: "Deletes unverified accounts older than 24 hours",
        canTriggerManually: true,
        action: "verification-cleanup",
      },
      {
        name: "Reset Token Cleanup",
        schedule: "Every hour",
        description: "Clears expired password reset tokens",
        canTriggerManually: true,
        action: "reset-token-cleanup",
      },
    ],
  });
});

// POST — manual trigger
export const POST = withLicenseAuth(async (req) => {
  const body = await req.json();
  const { action } = body;

  switch (action) {
    case "daily-report": {
      const result = await runDailyReport();
      return licenseApiSuccess(result);
    }
    case "verification-cleanup": {
      const result = await runVerificationCleanup();
      return licenseApiSuccess(result);
    }
    case "reset-token-cleanup": {
      const result = await runResetTokenCleanup();
      return licenseApiSuccess(result);
    }
    default:
      return licenseApiError("BAD_REQUEST", `Unknown action: ${action}`, 400);
  }
});
