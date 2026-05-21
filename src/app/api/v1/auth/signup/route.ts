// src/app/api/v1/auth/signup/route.ts — FINAL with OTP email

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, signToken, setAuthCookie } from "@/lib/auth";
import { SignupSchema } from "@/lib/validation";
import { OrganizationService } from "@/services/organization.service";
import { generateOTP, getOTPExpiry } from "@/lib/otp";
import { sendVerificationEmail } from "@/lib/license-smtp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = SignupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, password, organizationName } = parsed.data;

    // Email already registered?
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "EMAIL_EXISTS", message: "Email already registered" },
        { status: 409 }
      );
    }

    // Check if SMTP is configured
    const smtpSettings = await prisma.licenseSettings.findFirst();
    const smtpConfigured = !!(
      smtpSettings?.smtpHost &&
      smtpSettings?.smtpUser &&
      smtpSettings?.smtpPass &&
      smtpSettings?.fromEmail
    );

    // Generate OTP if SMTP configured
    const otp = smtpConfigured ? generateOTP() : null;
    const otpExpiry = smtpConfigured ? getOTPExpiry(10) : null;

    // If SMTP configured → not verified yet
    // If SMTP not configured → auto verify
    const isVerified = !smtpConfigured;

    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        isVerified,
        verificationOtp: otp,
        otpExpiry,
      },
      select: {
        id: true, name: true, email: true,
        avatarUrl: true, isVerified: true,
        uniqueCode: true, codeType: true,
      },
    });

    // Create organization
    const orgName = organizationName || `${name}'s Workspace`;
    const org = await OrganizationService.create(user.id, orgName);

    // Send OTP email if SMTP configured
    let emailSent = false;
    let emailError = null;

    if (smtpConfigured && otp) {
      try {
        await sendVerificationEmail(email, name, otp);
        emailSent = true;
      } catch (err: any) {
        // Email failed — auto verify the user so they can still login
        emailError = err.message;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            isVerified: true,
            verificationOtp: null,
            otpExpiry: null,
          },
        });
      }
    }

    // Issue JWT only if verified
    const finalUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true, name: true, email: true,
        avatarUrl: true, isVerified: true,
        uniqueCode: true, codeType: true,
      },
    });

    let token = null;
    if (finalUser?.isVerified) {
      token = await signToken({ userId: user.id, email: user.email });
      await setAuthCookie(token);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          user: finalUser,
          organizationId: org.id,
          token,
          // Tell frontend what to do next
          nextStep: finalUser?.isVerified ? "dashboard" : "verify-otp",
          emailSent,
          smtpConfigured,
          // Show OTP in dev mode
          ...(process.env.NODE_ENV === "development" && otp
            ? { devOtp: otp }
            : {}),
          // Message if email fails
          ...(emailError
            ? { warning: "Email could not be sent. You have been auto-verified." }
            : {}),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[POST /auth/signup]", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: "Signup failed" },
      { status: 500 }
    );
  }
}
