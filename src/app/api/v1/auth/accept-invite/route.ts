// src/app/api/v1/auth/accept-invite/route.ts — NEW
// Employee accepts invite + registers

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, signToken, setAuthCookie } from "@/lib/auth";
import { OrganizationService } from "@/services/organization.service";
import { sendWelcomeEmail } from "@/lib/license-smtp";
import { z } from "zod";

// GET — validate invite token (on page load)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { success: false, error: "MISSING_TOKEN", message: "Invitation token is required" },
      { status: 400 }
    );
  }

  const invite = await prisma.invite.findUnique({
    where: { token },
    include: {
      organization: { select: { id: true, name: true, logoUrl: true } },
    },
  });

  if (!invite) {
    return NextResponse.json(
      { success: false, error: "INVALID_TOKEN", message: "Invalid invitation link" },
      { status: 404 }
    );
  }

  if (invite.acceptedAt) {
    return NextResponse.json(
      { success: false, error: "ALREADY_ACCEPTED", message: "This invitation has already been accepted" },
      { status: 400 }
    );
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json(
      { success: false, error: "EXPIRED", message: "This invitation has expired. Ask your admin to send a new one." },
      { status: 400 }
    );
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: invite.email },
    select: { id: true, name: true },
  });

  return NextResponse.json({
    success: true,
    data: {
      email: invite.email,
      role: invite.role,
      organization: invite.organization,
      expiresAt: invite.expiresAt,
      userExists: !!existingUser, // true = login, false = register
    },
  });
}

// POST — invite accept + register/login
const AcceptInviteSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(2).max(100).optional(),
  password: z.string().min(8).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = AcceptInviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { token, name, password } = parsed.data;

    // Validate invite
    const invite = await prisma.invite.findUnique({
      where: { token },
      include: {
        organization: { select: { id: true, name: true } },
      },
    });

    if (!invite) {
      return NextResponse.json(
        { success: false, error: "INVALID_TOKEN", message: "Invalid invitation link" },
        { status: 404 }
      );
    }

    if (invite.acceptedAt) {
      return NextResponse.json(
        { success: false, error: "ALREADY_ACCEPTED", message: "Invitation already accepted" },
        { status: 400 }
      );
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: "EXPIRED", message: "Invitation has expired" },
        { status: 400 }
      );
    }

    // User exists already?
    let existingUser = await prisma.user.findUnique({
      where: { email: invite.email },
      select: { id: true, name: true, email: true, avatarUrl: true, uniqueCode: true },
    });

    let userId: string;

    if (existingUser) {
      // User already exists — accept invite directly
      userId = existingUser.id;
    } else {
      // New user — name + password required
      if (!name || !password) {
        return NextResponse.json(
          {
            success: false,
            error: "REGISTRATION_REQUIRED",
            message: "Please provide your name and password to create your account",
          },
          { status: 400 }
        );
      }

      const passwordHash = await hashPassword(password);

      const newUser = await prisma.user.create({
        data: {
          name,
          email: invite.email,
          passwordHash,
          isVerified: true, // Auto-verified since they came from invitation
        },
        select: { id: true, name: true, email: true, avatarUrl: true, uniqueCode: true },
      });

      userId = newUser.id;
      existingUser = newUser;
    }

    // Accept invite — create membership + assign EMP code
    await OrganizationService.acceptInvite(token, userId);

    // Updated user (with uniqueCode)
    const finalUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true,
        avatarUrl: true, uniqueCode: true, codeType: true,
      },
    });

    // Welcome email (fire and forget)
    sendWelcomeEmail(
      invite.email,
      finalUser?.name || name || "there",
      invite.organization.name
    ).catch((err: any) => console.error("[Welcome Email Failed]", err.message));

    // Issue JWT token
    const jwtToken = await signToken({
      userId,
      email: invite.email,
      organizationId: invite.organizationId,
      role: invite.role,
    });
    await setAuthCookie(jwtToken);

    // Save org id for localStorage
    return NextResponse.json({
      success: true,
      data: {
        user: finalUser,
        organization: {
          id: invite.organization.id,
          name: invite.organization.name,
        },
        role: invite.role,
        token: jwtToken,
      },
      message: `Welcome to ${invite.organization.name}!`,
    });
  } catch (error: any) {
    console.error("[POST /auth/accept-invite]", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: error.message || "Failed to accept invite" },
      { status: 500 }
    );
  }
}
