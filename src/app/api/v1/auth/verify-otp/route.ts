// src/app/api/v1/auth/verify-otp/route.ts — NEW

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { signToken, setAuthCookie } from "@/lib/auth";
import { isOTPExpired } from "@/lib/otp";
import { sendWelcomeEmail } from "@/lib/license-smtp";
import { z } from "zod";

const VerifyOTPSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

// POST — verify OTP
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = VerifyOTPSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, otp } = parsed.data;

    // User शोधा
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true, name: true, email: true,
        avatarUrl: true, isVerified: true,
        verificationOtp: true, otpExpiry: true,
        uniqueCode: true, codeType: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND", message: "User not found" },
        { status: 404 }
      );
    }

    // Already verified?
    if (user.isVerified) {
      return NextResponse.json(
        { success: false, error: "ALREADY_VERIFIED", message: "Email is already verified" },
        { status: 400 }
      );
    }

    // OTP expired?
    if (isOTPExpired(user.otpExpiry)) {
      return NextResponse.json(
        {
          success: false,
          error: "OTP_EXPIRED",
          message: "OTP has expired. Please request a new one.",
        },
        { status: 400 }
      );
    }

    // OTP match?
    if (user.verificationOtp !== otp) {
      return NextResponse.json(
        { success: false, error: "INVALID_OTP", message: "Invalid OTP. Please check and try again." },
        { status: 400 }
      );
    }

    // Mark verified + clear OTP
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationOtp: null,
        otpExpiry: null,
      },
    });

    // Get org name for welcome email
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id },
      include: { organization: { select: { name: true } } },
    });

    // Send welcome email (fire and forget)
    sendWelcomeEmail(
      user.email,
      user.name,
      membership?.organization.name || "Your Organization"
    ).catch((err) => console.error("[Welcome Email Failed]", err.message));

    // Issue JWT token
    const token = await signToken({
      userId: user.id,
      email: user.email,
    });
    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          isVerified: true,
          uniqueCode: user.uniqueCode,
          codeType: user.codeType,
        },
        token,
        nextStep: "dashboard",
      },
      message: "Email verified successfully! Welcome to CallLog SaaS.",
    });
  } catch (error) {
    console.error("[POST /auth/verify-otp]", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: "Verification failed" },
      { status: 500 }
    );
  }
}

// POST /resend — Resend OTP
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body.email?.trim();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "VALIDATION_ERROR", message: "Email required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, isVerified: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND", message: "User not found" },
        { status: 404 }
      );
    }

    if (user.isVerified) {
      return NextResponse.json(
        { success: false, error: "ALREADY_VERIFIED", message: "Already verified" },
        { status: 400 }
      );
    }

    // Check SMTP
    const smtpSettings = await prisma.licenseSettings.findFirst();
    const smtpConfigured = !!(
      smtpSettings?.smtpHost &&
      smtpSettings?.smtpUser &&
      smtpSettings?.smtpPass
    );

    if (!smtpConfigured) {
      // Auto verify if no SMTP
      await prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true, verificationOtp: null, otpExpiry: null },
      });
      return NextResponse.json({
        success: true,
        message: "SMTP not configured. You have been auto-verified.",
        autoVerified: true,
      });
    }

    // Generate new OTP
    const { generateOTP, getOTPExpiry } = await import("@/lib/otp");
    const { sendVerificationEmail } = await import("@/lib/license-smtp");

    const newOtp = generateOTP();
    const newExpiry = getOTPExpiry(10);

    await prisma.user.update({
      where: { id: user.id },
      data: { verificationOtp: newOtp, otpExpiry: newExpiry },
    });

    await sendVerificationEmail(user.email, user.name, newOtp);

    return NextResponse.json({
      success: true,
      message: "New OTP sent to your email",
      ...(process.env.NODE_ENV === "development" ? { devOtp: newOtp } : {}),
    });
  } catch (error: any) {
    console.error("[PUT /auth/verify-otp]", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: error.message },
      { status: 500 }
    );
  }
}
