// src/app/api/v1/auth/signup/route.ts — FINAL

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, signToken, setAuthCookie } from "@/lib/auth";
import { SignupSchema } from "@/lib/validation";
import { OrganizationService } from "@/services/organization.service";

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

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "EMAIL_EXISTS", message: "Email already registered" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: { name, email, passwordHash, isVerified: true },
      select: { id: true, name: true, email: true, avatarUrl: true },
    });

    // Organization create — owner code पण assign होतो आत
    const orgName = organizationName || `${name}'s Workspace`;
    const org = await OrganizationService.create(user.id, orgName);

    // Code सह updated user
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true, name: true, email: true,
        avatarUrl: true, uniqueCode: true, codeType: true,
      },
    });

    const token = await signToken({ userId: user.id, email: user.email });
    await setAuthCookie(token);

    return NextResponse.json(
      {
        success: true,
        data: { user: updatedUser, organizationId: org.id, token },
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
