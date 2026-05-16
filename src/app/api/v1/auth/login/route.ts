// src/app/api/v1/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, signToken, setAuthCookie } from "@/lib/auth";
import { LoginSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, avatarUrl: true, passwordHash: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "INVALID_CREDENTIALS", message: "Invalid email or password" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "INVALID_CREDENTIALS", message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Get user's organizations
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      include: { organization: true },
      orderBy: { joinedAt: "asc" },
    });

    const token = await signToken({ userId: user.id, email: user.email });
    await setAuthCookie(token);

    const { passwordHash: _, ...safeUser } = user;

    return NextResponse.json({
      success: true,
      data: {
        user: safeUser,
        organizations: memberships.map((m) => ({
          ...m.organization,
          role: m.role,
        })),
        token,
      },
    });
  } catch (error) {
    console.error("[POST /auth/login]", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: "Login failed" },
      { status: 500 }
    );
  }
}
