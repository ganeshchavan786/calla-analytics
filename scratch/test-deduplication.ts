// scratch/test-deduplication.ts
// Test script to verify call log deduplication behavior

import { PrismaClient } from "@prisma/client";
import { CallLogService } from "../src/services/callLog.service";

const prisma = new PrismaClient();

async function runTests() {
  console.log("🧪 Running Deduplication Tests...");

  try {
    // 1. Get user & organization
    const user = await prisma.user.findFirst({
      where: { email: "admin@demo.com" }
    });
    if (!user) {
      throw new Error("Admin user not found. Please run 'npm run db:seed' first.");
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id }
    });
    if (!membership) {
      throw new Error("Admin membership not found.");
    }

    const orgId = membership.organizationId;
    const testNumber = "+9999999999";

    // Clean up any existing test records for this number first
    await prisma.callLog.deleteMany({
      where: { mobileNumber: testNumber }
    });

    console.log(`✅ Cleaned up old test logs. Using user: ${user.name}, orgId: ${orgId}`);

    // Create valid ImportBatch records to satisfy foreign key constraints
    const batch1 = await prisma.importBatch.create({
      data: {
        organizationId: orgId,
        importedById: user.id,
        source: "MOBILE_SYNC",
        status: "PROCESSING",
      }
    });
    const batch1Id = batch1.id;

    // TEST 1: In-Memory Deduplication (Sending exact duplicate calls in the same batch)
    console.log("\n--------------------------------------------------");
    console.log("TEST 1: In-Memory Deduplication in Same Batch");
    console.log("--------------------------------------------------");
    const testDate = new Date("2026-05-21T07:31:00.123Z"); // Notice the .123ms precision

    const duplicatePayload = [
      {
        mobileNumber: testNumber,
        contactName: "Test Duplicate",
        callType: "MISSED",
        date: testDate,
        duration: 0,
        simSlot: "SIM_1",
      },
      {
        mobileNumber: testNumber,
        contactName: "Test Duplicate",
        callType: "MISSED",
        date: testDate, // Same time, same mobile number
        duration: 0,
        simSlot: "SIM_1",
      }
    ];

    const result1 = await CallLogService.bulkCreate(orgId, user.id, batch1Id, duplicatePayload);
    console.log(`Result of bulkCreate:`, result1);

    // Verify DB count
    const dbCount1 = await prisma.callLog.count({
      where: { mobileNumber: testNumber }
    });
    console.log(`DB Count (Expected 1): ${dbCount1}`);
    if (dbCount1 !== 1) {
      throw new Error(`TEST 1 FAILED: Expected 1 call log, found ${dbCount1}`);
    }
    console.log("⭐ TEST 1 PASSED!");

    // TEST 2: Consecutive batch sync with millisecond precision difference/checking
    console.log("\n--------------------------------------------------");
    console.log("TEST 2: Consecutive Sync checking (existing DB entries)");
    console.log("--------------------------------------------------");
    const batch2 = await prisma.importBatch.create({
      data: {
        organizationId: orgId,
        importedById: user.id,
        source: "MOBILE_SYNC",
        status: "PROCESSING",
      }
    });
    const batch2Id = batch2.id;
    
    // We send the same log again in a second batch (e.g. standard retry)
    // The date has .123ms, which gets truncated to .000ms. We verify it matches against stored .000ms.
    const result2 = await CallLogService.bulkCreate(orgId, user.id, batch2Id, [
      {
        mobileNumber: testNumber,
        contactName: "Test Duplicate",
        callType: "MISSED",
        date: testDate,
        duration: 0,
        simSlot: "SIM_1",
      }
    ]);
    console.log(`Result of bulkCreate (Expected 0 success, 1 fail/skipped):`, result2);

    const dbCount2 = await prisma.callLog.count({
      where: { mobileNumber: testNumber }
    });
    console.log(`DB Count (Expected 1): ${dbCount2}`);
    if (dbCount2 !== 1) {
      throw new Error(`TEST 2 FAILED: Expected 1 call log, found ${dbCount2}`);
    }
    console.log("⭐ TEST 2 PASSED!");

    // TEST 3: Concurrent Sync Requests (Simulating race conditions)
    console.log("\n--------------------------------------------------");
    console.log("TEST 3: Concurrent Sync Requests (Race Condition)");
    console.log("--------------------------------------------------");
    // Clean up test records
    await prisma.callLog.deleteMany({
      where: { mobileNumber: testNumber }
    });

    const newTestDate = new Date("2026-05-21T08:45:00.456Z");
    const concurrentPayload = [
      {
        mobileNumber: testNumber,
        contactName: "Test Concurrent",
        callType: "INCOMING",
        date: newTestDate,
        duration: 120,
        simSlot: "SIM_2",
      }
    ];

    const batchC1 = await prisma.importBatch.create({
      data: { organizationId: orgId, importedById: user.id, source: "MOBILE_SYNC", status: "PROCESSING" }
    });
    const batchC2 = await prisma.importBatch.create({
      data: { organizationId: orgId, importedById: user.id, source: "MOBILE_SYNC", status: "PROCESSING" }
    });

    console.log("Executing two bulkCreate requests concurrently...");
    const [cResult1, cResult2] = await Promise.all([
      CallLogService.bulkCreate(orgId, user.id, batchC1.id, concurrentPayload),
      CallLogService.bulkCreate(orgId, user.id, batchC2.id, concurrentPayload)
    ]);

    console.log("Concurrent Request 1 Result:", cResult1);
    console.log("Concurrent Request 2 Result:", cResult2);

    // Verify DB count
    const dbCount3 = await prisma.callLog.count({
      where: { mobileNumber: testNumber }
    });
    console.log(`DB Count (Expected 1): ${dbCount3}`);
    if (dbCount3 !== 1) {
      throw new Error(`TEST 3 FAILED: Expected 1 call log, found ${dbCount3}`);
    }
    console.log("⭐ TEST 3 PASSED!");

    console.log("\n🎉 ALL DEDUPLICATION TESTS PASSED SUCCESSFULLY! 🎉\n");

  } catch (error) {
    console.error("❌ Test run failed with error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
