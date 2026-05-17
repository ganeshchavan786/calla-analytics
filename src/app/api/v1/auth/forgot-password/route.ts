// src/app/api/v1/auth/forgot-password/route.ts — FINAL with actual email

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateResetToken } from "@/lib/auth";
import { sendForgotPasswordEmail } from "@/lib/license-smtp";
import { ForgotPasswordSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ForgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // Always return success to prevent email enumeration
    const successResponse = {
      success: true,
      message: "If that email is registered, you will receive a reset link.",
    };

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    if (!user) return NextResponse.json(successResponse);

    // Generate reset token
    const token = generateResetToken();
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { email },
      data: { resetToken: token, resetTokenExpiry: expiry },
    });

    // Check SMTP configured
    const smtpSettings = await prisma.licenseSettings.findFirst();
    const smtpConfigured = !!(
      smtpSettings?.smtpHost &&
      smtpSettings?.smtpUser &&
      smtpSettings?.smtpPass &&
      smtpSettings?.fromEmail
    );

    if (smtpConfigured) {
      try {
        await sendForgotPasswordEmail(user.email, user.name, token);
      } catch (err: any) {
        console.error("[Forgot Password Email Failed]", err.message);
        // Email fail झाला तरी token save आहे
        // Dev mode मध्ये link console मध्ये दाखवा
        const appUrl = smtpSettings?.appUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        console.log(`[DEV] Reset link: ${appUrl}/auth/reset-password?token=${token}`);
      }
    } else {
      // SMTP नाही — console मध्ये दाखवा (dev साठी)
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const resetLink = `${appUrl}/auth/reset-password?token=${token}`;
      console.log(`[DEV - SMTP not configured] Reset link for ${email}: ${resetLink}`);
    }

    return NextResponse.json({
      ...successResponse,
      smtpConfigured,
      // Dev mode मध्ये token expose करा
      ...(process.env.NODE_ENV === "development"
        ? { devToken: token, devNote: "SMTP not configured — use this token directly" }
        : {}),
    });
  } catch (error) {
    console.error("[POST /auth/forgot-password]", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: "Request failed" },
      { status: 500 }
    );
  }
}
