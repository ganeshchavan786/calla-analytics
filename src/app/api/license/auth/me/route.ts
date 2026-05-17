// src/app/api/license/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withLicenseAuth, licenseApiSuccess, licenseApiError } from "@/lib/license-auth";
import prisma from "@/lib/prisma";

export const GET = withLicenseAuth(async (_req, adminId) => {
  const admin = await prisma.superAdmin.findUnique({
    where: { id: adminId },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  if (!admin) return licenseApiError("NOT_FOUND", "Admin not found", 404);
  return licenseApiSuccess(admin);
});
