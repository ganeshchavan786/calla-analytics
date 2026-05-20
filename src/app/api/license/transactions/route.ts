import { NextRequest } from "next/server";
import { withLicenseAuth, licenseApiSuccess } from "@/lib/license-auth";
import prisma from "@/lib/prisma";

export const GET = withLicenseAuth(async (req: NextRequest) => {
  const transactions = await prisma.paymentTransaction.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      organization: {
        select: { name: true, planType: true },
      },
    },
  });

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let totalRevenue = 0;
  let thisMonthRevenue = 0;

  transactions.forEach(t => {
    if (t.status === "SUCCESS") {
      totalRevenue += t.amount;
      const tDate = new Date(t.createdAt);
      if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
        thisMonthRevenue += t.amount;
      }
    }
  });

  return licenseApiSuccess({
    transactions,
    totalRevenue,
    thisMonthRevenue,
  });
});
