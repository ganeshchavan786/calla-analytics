// src/app/api/license/payment-settings/route.ts
import { withLicenseAuth, licenseApiSuccess, licenseApiError } from "@/lib/license-auth";
import prisma from "@/lib/prisma";
import { encrypt, decrypt, maskSecret } from "@/lib/encryption";
import { z } from "zod";

const PaymentSettingsSchema = z.object({
  paymentEnabled: z.boolean(),
  paymentMode: z.enum(["test", "live"]),
  razorpayKeyId: z.string().min(1, "Razorpay Key ID is required"),
  razorpayKeySecret: z.string().min(1, "Razorpay Key Secret is required"),
});

// GET — Fetch current payment settings (secret masked)
export const GET = withLicenseAuth(async () => {
  try {
    let settings = await prisma.licenseSettings.findFirst();
    if (!settings) {
      settings = await prisma.licenseSettings.create({ data: {} });
    }

    // Decrypt key ID for display, mask secret
    const decryptedKeyId = settings.razorpayKeyId ? decrypt(settings.razorpayKeyId) : "";
    const decryptedSecret = settings.razorpayKeySecret ? decrypt(settings.razorpayKeySecret) : "";

    return licenseApiSuccess({
      paymentEnabled: settings.paymentEnabled,
      paymentMode: settings.paymentMode,
      razorpayKeyId: decryptedKeyId,
      razorpayKeySecret: decryptedSecret ? maskSecret(decryptedSecret) : "",
      hasSecret: !!decryptedSecret,
    });
  } catch (error) {
    console.error("[GET /api/license/payment-settings] error:", error);
    return licenseApiError("INTERNAL_ERROR", "Failed to fetch payment settings", 500);
  }
});

// PUT — Save/update payment settings (encrypt before saving)
export const PUT = withLicenseAuth(async (req) => {
  try {
    const body = await req.json();
    const parsed = PaymentSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return licenseApiError("VALIDATION_ERROR", parsed.error.flatten().fieldErrors as any, 400);
    }

    const { paymentEnabled, paymentMode, razorpayKeyId, razorpayKeySecret } = parsed.data;

    // Encrypt credentials before storing
    const encryptedKeyId = encrypt(razorpayKeyId);

    // If secret is the masked version (hasn't changed), keep old encrypted value
    let encryptedSecret: string;
    if (razorpayKeySecret.includes("****")) {
      // Secret wasn't changed — keep existing encrypted value
      const existing = await prisma.licenseSettings.findFirst();
      encryptedSecret = existing?.razorpayKeySecret || "";
    } else {
      encryptedSecret = encrypt(razorpayKeySecret);
    }

    let settings = await prisma.licenseSettings.findFirst();
    if (settings) {
      settings = await prisma.licenseSettings.update({
        where: { id: settings.id },
        data: {
          paymentEnabled,
          paymentMode,
          razorpayKeyId: encryptedKeyId,
          razorpayKeySecret: encryptedSecret,
        },
      });
    } else {
      settings = await prisma.licenseSettings.create({
        data: {
          paymentEnabled,
          paymentMode,
          razorpayKeyId: encryptedKeyId,
          razorpayKeySecret: encryptedSecret,
        },
      });
    }

    return licenseApiSuccess({
      message: "Payment settings saved successfully",
      paymentEnabled: settings.paymentEnabled,
      paymentMode: settings.paymentMode,
      razorpayKeyId: razorpayKeyId,
      razorpayKeySecret: maskSecret(razorpayKeySecret.includes("****") ? "unchanged" : razorpayKeySecret),
    });
  } catch (error) {
    console.error("[PUT /api/license/payment-settings] error:", error);
    return licenseApiError("INTERNAL_ERROR", "Failed to save payment settings", 500);
  }
});

// POST — Test Razorpay connection
export const POST = withLicenseAuth(async (req) => {
  try {
    const body = await req.json();

    if (body.action !== "test") {
      return licenseApiError("BAD_REQUEST", "Invalid action", 400);
    }

    // Get stored credentials
    const settings = await prisma.licenseSettings.findFirst();
    if (!settings || !settings.razorpayKeyId || !settings.razorpayKeySecret) {
      return licenseApiError("BAD_REQUEST", "Please save Razorpay credentials first", 400);
    }

    const keyId = decrypt(settings.razorpayKeyId);
    const keySecret = decrypt(settings.razorpayKeySecret);

    if (!keyId || !keySecret) {
      return licenseApiError("BAD_REQUEST", "Invalid or corrupted credentials. Please re-enter.", 400);
    }

    // Test Razorpay API by fetching account info
    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/payments?count=1", {
      headers: {
        Authorization: `Basic ${authHeader}`,
      },
    });

    if (response.ok) {
      return licenseApiSuccess({
        message: "Razorpay connection successful! Credentials are valid.",
        status: "connected",
      });
    } else {
      const errorData = await response.json().catch(() => ({}));
      return licenseApiError(
        "CONNECTION_FAILED",
        `Razorpay API returned ${response.status}: ${(errorData as any)?.error?.description || "Authentication failed. Please check your credentials."}`,
        400
      );
    }
  } catch (error: any) {
    console.error("[POST /api/license/payment-settings] test error:", error);
    return licenseApiError(
      "CONNECTION_FAILED",
      `Connection test failed: ${error.message || "Network error"}`,
      500
    );
  }
});
