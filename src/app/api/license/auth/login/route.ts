// src/app/api/license/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { signLicenseToken, setLicenseCookie } from "@/lib/license-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "VALIDATION_ERROR", message: "Email and password required" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const admin = await prisma.superAdmin.findUnique({ where: { email } });

    if (!admin) {
      return NextResponse.json(
        { success: false, error: "INVALID_CREDENTIALS", message: "Invalid email or password" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "INVALID_CREDENTIALS", message: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = await signLicenseToken({
      superAdminId: admin.id,
      email: admin.email,
    });

    await setLicenseCookie(token);

    return NextResponse.json({
      success: true,
      data: {
        admin: { id: admin.id, email: admin.email, name: admin.name },
        token,
      },
    });
  } catch (error) {
    console.error("[License Login]", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: "Login failed" },
      { status: 500 }
    );
  }
}
