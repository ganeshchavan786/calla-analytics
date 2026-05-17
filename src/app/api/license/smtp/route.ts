// src/app/api/license/smtp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withLicenseAuth, licenseApiSuccess, licenseApiError } from "@/lib/license-auth";
import { testSmtpConnection } from "@/lib/license-smtp";
import prisma from "@/lib/prisma";
import { z } from "zod";

const SmtpSchema = z.object({
  smtpHost: z.string().min(1),
  smtpPort: z.number().int().min(1).max(65535),
  smtpUser: z.string().min(1),
  smtpPass: z.string().min(1),
  smtpSecure: z.boolean().default(false),
  fromEmail: z.string().email(),
  fromName: z.string().min(1),
  appName: z.string().min(1),
  supportEmail: z.string().email().optional().or(z.literal("")),
  appUrl: z.string().url().optional().or(z.literal("")),
  cronReportEmail: z.string().email().optional().or(z.literal("")),
  cronReportTime: z.string().regex(/^\d{2}:\d{2}$/).default("09:00"),
  cronReportEnabled: z.boolean().default(true),
});

// GET — current settings
export const GET = withLicenseAuth(async () => {
  const settings = await prisma.licenseSettings.findFirst();
  if (!settings) {
    // Create default
    const def = await prisma.licenseSettings.create({ data: {} });
    return licenseApiSuccess({ ...def, smtpPass: "" });
  }
  // Never expose password fully
  return licenseApiSuccess({ ...settings, smtpPass: settings.smtpPass ? "••••••••" : "" });
});

// POST — save settings
export const POST = withLicenseAuth(async (req) => {
  const body = await req.json();

  // If testing connection
  if (body.action === "test") {
    const result = await testSmtpConnection();
    return licenseApiSuccess(result);
  }

  const parsed = SmtpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.licenseSettings.findFirst();

  const data = {
    ...parsed.data,
    supportEmail: parsed.data.supportEmail || "",
    appUrl: parsed.data.appUrl || "",
    cronReportEmail: parsed.data.cronReportEmail || "",
  };

  let settings;
  if (existing) {
    settings = await prisma.licenseSettings.update({
      where: { id: existing.id },
      data,
    });
  } else {
    settings = await prisma.licenseSettings.create({ data });
  }

  return licenseApiSuccess({ ...settings, smtpPass: "••••••••" });
});
