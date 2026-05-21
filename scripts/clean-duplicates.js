// scripts/clean-duplicates.js
// One-time script to clean up duplicate call logs from the database
// Safe to run on development or production databases

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function cleanDuplicates() {
  console.log("🚀 Starting database cleanup for duplicate call logs...");
  try {
    // 1. Let's count how many total logs we have before cleanup
    const beforeCount = await prisma.callLog.count();
    console.log(`📊 Total call logs before cleanup: ${beforeCount}`);

    // 2. Perform the global deduplication delete query
    // This SQL statement is standard and works on SQLite, PostgreSQL, and MySQL.
    // It groups by core fields and keeps only the earliest entry (MIN id) for each group, deleting others.
    const deletedCount = await prisma.$executeRawUnsafe(`
      DELETE FROM "CallLog"
      WHERE "id" NOT IN (
        SELECT MIN("id")
        FROM "CallLog"
        GROUP BY "organizationId", "importedById", "mobileNumber", "date", "callType", "duration", "simSlot"
      )
    `);

    // 3. Count total logs after cleanup
    const afterCount = await prisma.callLog.count();
    console.log(`✅ Cleanup completed successfully!`);
    console.log(`🗑️  Total duplicates deleted: ${deletedCount}`);
    console.log(`📊 Total call logs remaining: ${afterCount}`);

  } catch (error) {
    console.error("❌ Error during database cleanup:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDuplicates();
