import { NextResponse } from "next/server";
import { withAuth, apiSuccess, apiError } from "@/lib/middleware";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const PRICE_PER_USER_PER_MONTH = 125;

export const GET = withAuth(async (req, ctx) => {
  // Only owners and admins can check billing (usually owners, but admins can invite too)
  const { organizationId } = ctx;

  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { planType: true, subscriptionEndDate: true },
    });

    if (!org) {
      return apiError("ORG_NOT_FOUND", "Organization not found", 404);
    }

    // If it's a free trial, there's no pro-rata cost to invite someone (up to limit)
    if (org.planType === "FREE_TRIAL") {
      return apiSuccess({
        amount: 0,
        currency: "INR",
        daysRemaining: 0,
        message: "No charge for Free Trial members",
      });
    }

    // If plan is ACTIVE_PAID or ENTERPRISE, calculate pro-rata
    let daysRemaining = 0;
    if (org.subscriptionEndDate) {
      const now = new Date();
      const end = new Date(org.subscriptionEndDate);
      if (end > now) {
        daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 3600 * 24));
      }
    }

    if (daysRemaining <= 0) {
      return apiSuccess({
        amount: 0,
        currency: "INR",
        daysRemaining: 0,
        message: "Subscription expired. Renew plan instead.",
      });
    }

    const dailyRate = PRICE_PER_USER_PER_MONTH / 30;
    let proRataAmount = Math.ceil(daysRemaining * dailyRate);

    // Minimum charge of ₹1 if there is >0 days remaining, just to be safe with Razorpay limits (₹1 min)
    if (proRataAmount < 1) proRataAmount = 1;

    return apiSuccess({
      amount: proRataAmount,
      currency: "INR",
      daysRemaining,
      dailyRate: dailyRate.toFixed(2),
    });
  } catch (error: any) {
    console.error("Pro-Rata Calc Error:", error);
    return apiError("PRO_RATA_FAILED", error.message || "Failed to calculate pro-rata", 500);
  }
});
