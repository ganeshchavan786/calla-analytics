import { NextResponse } from "next/server";
import { withAuth, apiSuccess, apiError } from "@/lib/middleware";
import { PrismaClient } from "@prisma/client";
import Razorpay from "razorpay";
import { decrypt } from "@/lib/encryption";

const prisma = new PrismaClient();

export const POST = withAuth(async (req, ctx) => {
  // Only owners can initiate billing
  if (ctx.role !== "OWNER") {
    return apiError("FORBIDDEN", "Only organization owners can initiate billing", 403);
  }

  const { organizationId } = ctx;
  const body = await req.json();
  const { planMonths, memberCount, amount } = body;

  if (!amount || amount <= 0) {
    return apiError("INVALID_AMOUNT", "Amount must be greater than 0", 400);
  }

  try {
    // 1. Fetch Razorpay Settings from LicenseSettings
    const license = await prisma.licenseSettings.findFirst({
      where: { isActive: true },
    });

    if (!license || !license.paymentEnabled || !license.razorpayKeyId || !license.razorpayKeySecret) {
      return apiError("PAYMENT_DISABLED", "Payment gateway is not configured or disabled", 400);
    }

    const keySecret = decrypt(license.razorpayKeySecret);

    // 2. Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: license.razorpayKeyId,
      key_secret: keySecret,
    });

    // 3. Create Order
    const options = {
      amount: Math.round(amount * 100), // Razorpay amount is in paise
      currency: "INR",
      receipt: `receipt_org_${organizationId}_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    // 4. Record Transaction as PENDING
    const transaction = await prisma.paymentTransaction.create({
      data: {
        organizationId,
        razorpayOrderId: order.id,
        amount: amount,
        currency: "INR",
        status: "PENDING",
        type: planMonths ? "RENEWAL" : "ADD_MEMBER",
      },
    });

    return apiSuccess({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: license.razorpayKeyId,
    });
  } catch (error: any) {
    console.error("Razorpay Create Order Error:", error);
    return apiError("ORDER_CREATE_FAILED", error.message || "Failed to create payment order", 500);
  }
}, "OWNER");
