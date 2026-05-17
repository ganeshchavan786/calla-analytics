// prisma/license-seed.ts
// Super Admin + Default License Settings seed
// Run: npx tsx prisma/license-seed.ts

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🔐 Seeding License Manager...");

  // Super Admin
  const existing = await prisma.superAdmin.findFirst();
  if (!existing) {
    const passwordHash = await bcrypt.hash("SuperAdmin@123", 12);
    await prisma.superAdmin.create({
      data: {
        email: "superadmin@calllog.com",
        name: "Super Admin",
        passwordHash,
      },
    });
    console.log("✅ Super Admin created");
    console.log("   Email:    superadmin@calllog.com");
    console.log("   Password: SuperAdmin@123");
  } else {
    console.log("ℹ️  Super Admin already exists");
  }

  // Default License Settings
  const settings = await prisma.licenseSettings.findFirst();
  if (!settings) {
    await prisma.licenseSettings.create({
      data: {
        appName: "CallLog SaaS",
        appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        fromName: "CallLog SaaS",
        cronReportTime: "09:00",
        cronReportEnabled: true,
      },
    });
    console.log("✅ Default License Settings created");
  } else {
    console.log("ℹ️  License Settings already exists");
  }

  console.log("\n✅ License Manager seed complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Login URL: http://localhost:3000/license/login");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
