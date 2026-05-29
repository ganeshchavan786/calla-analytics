import { NextResponse } from "next/server";
import { withAuth, apiSuccess, apiError } from "@/lib/middleware";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { decrypt } from "@/lib/encryption";

const prisma = new PrismaClient();

export const POST = withAuth(async (req, ctx) => {
  if (ctx.role !== "OWNER") {
    return apiError("FORBIDDEN", "Only organization owners can verify billing", 403);
  }

  const { organizationId } = ctx;
  const body = await req.json();
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planMonths } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return apiError("INVALID_DATA", "Missing Razorpay payment data", 400);
  }

  try {
    // 1. Fetch Razorpay Settings
    const license = await prisma.licenseSettings.findFirst({
      where: { isActive: true },
    });

    if (!license || !license.paymentEnabled || !license.razorpayKeySecret) {
      return apiError("PAYMENT_DISABLED", "Payment gateway is not configured", 400);
    }

    const keySecret = decrypt(license.razorpayKeySecret);

    // 2. Verify Signature
    const text = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(text.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      // Update transaction status to failed
      await prisma.paymentTransaction.updateMany({
        where: { razorpayOrderId: razorpay_order_id, organizationId },
        data: { status: "FAILED", razorpayPaymentId: razorpay_payment_id },
      });
      return apiError("SIGNATURE_MISMATCH", "Invalid payment signature", 400);
    }

    // 3. Mark transaction as SUCCESS
    await prisma.paymentTransaction.updateMany({
      where: { razorpayOrderId: razorpay_order_id, organizationId },
      data: { status: "SUCCESS", razorpayPaymentId: razorpay_payment_id },
    });

    // 4. Update Organization Subscription End Date
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) return apiError("ORG_NOT_FOUND", "Organization not found", 404);

    if (planMonths) {
      // Renew or Upgrade
      let currentEnd = org.subscriptionEndDate;
      if (!currentEnd || currentEnd < new Date()) {
        currentEnd = new Date();
      }
      
      const newEndDate = new Date(currentEnd);
      newEndDate.setMonth(newEndDate.getMonth() + planMonths);

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          planType: "ACTIVE_PAID",
          subscriptionEndDate: newEndDate,
        },
      });
    }

    return apiSuccess({ success: true, message: "Payment verified successfully" });
  } catch (error: any) {
    console.error("Razorpay Verify Error:", error);
    return apiError("VERIFY_FAILED", error.message || "Failed to verify payment", 500);
  }
}, "OWNER", { allowExpired: true });
