// src/app/api/license/auth/logout/route.ts
import { NextResponse } from "next/server";
import { clearLicenseCookie } from "@/lib/license-auth";

export async function POST() {
  await clearLicenseCookie();
  return NextResponse.json({ success: true, message: "Logged out" });
}
