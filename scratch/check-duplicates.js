const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkDuplicates() {
  console.log("Checking for duplicate call logs in dev.db...");
  try {
    const duplicates = await prisma.$queryRaw`
      SELECT mobileNumber, date, duration, callType, COUNT(*) as count, GROUP_CONCAT(id) as ids
      FROM CallLog
      WHERE deletedAt IS NULL
      GROUP BY organizationId, importedById, mobileNumber, date, duration, callType, simSlot
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 10
    `;

    console.log("Duplicate groups (top 10):", JSON.stringify(duplicates, null, 2));

    const totalDuplicates = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM (
        SELECT 1
        FROM CallLog
        WHERE deletedAt IS NULL
        GROUP BY organizationId, importedById, mobileNumber, date, duration, callType, simSlot
        HAVING COUNT(*) > 1
      )
    `;
    console.log("Total groups with duplicates:", totalDuplicates);

  } catch (error) {
    console.error("Error finding duplicates:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDuplicates();
