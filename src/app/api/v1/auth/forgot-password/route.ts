// src/app/api/v1/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateResetToken } from "@/lib/auth";
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
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If that email is registered, you will receive a reset link.",
      });
    }

    const token = generateResetToken();
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { email },
      data: { resetToken: token, resetTokenExpiry: expiry },
    });

    // In production: send email with reset link
    // await emailService.sendPasswordReset(email, token)
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${token}`;
    console.log(`[DEV] Password reset link for ${email}: ${resetLink}`);

    return NextResponse.json({
      success: true,
      message: "If that email is registered, you will receive a reset link.",
      // Only expose token in development for easy testing
      ...(process.env.NODE_ENV === "development" ? { devToken: token } : {}),
    });
  } catch (error) {
    console.error("[POST /auth/forgot-password]", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: "Request failed" },
      { status: 500 }
    );
  }
}
