// prisma/seed.ts
// Seed script — realistic demo data for development

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const INDIAN_NUMBERS = [
  "9876543210", "9123456789", "8765432109", "7654321098",
  "6543210987", "9988776655", "8877665544", "7766554433",
  "9911223344", "8800112233", "9700123456", "9600234567",
  "9500345678", "9400456789", "9300567890",
];

const CONTACT_NAMES = [
  "Rahul Sharma", "Priya Patel", "Amit Kumar", "Sunita Singh",
  "Vijay Verma", "Anita Gupta", "Ravi Mehta", "Kavita Joshi",
  "Sanjay Rao", "Deepika Nair", null, null, null, // some unknowns
];

const DEVICES = ["Samsung Galaxy S23", "Redmi Note 12", "iPhone 13", "OnePlus 11", "Realme GT"];
const TAGS_DATA = [
  { name: "Office", color: "#3b82f6" },
  { name: "Vendor", color: "#8b5cf6" },
  { name: "Client", color: "#10b981" },
  { name: "Personal", color: "#f59e0b" },
  { name: "Important", color: "#ef4444" },
  { name: "Follow-up", color: "#f97316" },
  { name: "Later", color: "#6b7280" },
  { name: "Support", color: "#06b6d4" },
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysBack: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - randomInt(0, daysBack));
  d.setHours(randomInt(7, 22), randomInt(0, 59), randomInt(0, 59));
  return d;
}

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.taskWatcher.deleteMany();
  await prisma.taskAttachment.deleteMany();
  await prisma.followUpTask.deleteMany();
  await prisma.callLogTag.deleteMany();
  await prisma.callNote.deleteMany();
  await prisma.callLog.deleteMany();
  await prisma.importBatch.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  // ============================================================
  // USERS
  // ============================================================

  console.log("Creating users...");
  const passwordHash = await bcrypt.hash("Admin1234", 12);

  const users = await Promise.all([
    prisma.user.create({
      data: { name: "Arjun Mehta", email: "admin@demo.com", passwordHash, isVerified: true },
    }),
    prisma.user.create({
      data: { name: "Priya Sharma", email: "manager@demo.com", passwordHash, isVerified: true },
    }),
    prisma.user.create({
      data: { name: "Rahul Verma", email: "member1@demo.com", passwordHash, isVerified: true },
    }),
    prisma.user.create({
      data: { name: "Sunita Patel", email: "member2@demo.com", passwordHash, isVerified: true },
    }),
    prisma.user.create({
      data: { name: "Amit Kumar", email: "guest@demo.com", passwordHash, isVerified: true },
    }),
  ]);

  const [owner, admin, member1, member2, guest] = users;

  // ============================================================
  // ORGANIZATIONS
  // ============================================================

  console.log("Creating organizations...");

  const org1 = await prisma.organization.create({
    data: {
      name: "Demo Corp Pvt Ltd",
      slug: "demo-corp",
      timezone: "Asia/Kolkata",
      members: {
        create: [
          { userId: owner.id, role: "OWNER" },
          { userId: admin.id, role: "ADMIN" },
          { userId: member1.id, role: "MEMBER" },
          { userId: member2.id, role: "MEMBER" },
          { userId: guest.id, role: "GUEST" },
        ],
      },
    },
  });

  const org2 = await prisma.organization.create({
    data: {
      name: "Test Startup",
      slug: "test-startup",
      timezone: "Asia/Kolkata",
      members: {
        create: [{ userId: owner.id, role: "OWNER" }],
      },
    },
  });

  // ============================================================
  // TAGS
  // ============================================================

  console.log("Creating tags...");
  const tags = await Promise.all(
    TAGS_DATA.map((t) =>
      prisma.tag.create({
        data: { organizationId: org1.id, name: t.name, color: t.color },
      })
    )
  );

  // ============================================================
  // IMPORT BATCHES
  // ============================================================

  console.log("Creating import batches...");

  const batch1 = await prisma.importBatch.create({
    data: {
      organizationId: org1.id,
      importedById: admin.id,
      source: "CSV",
      status: "COMPLETED",
      fileName: "calls_january_2024.csv",
      fileSize: 245760,
      totalRows: 500,
      successRows: 498,
      failedRows: 2,
      startedAt: new Date("2024-01-15T09:00:00"),
      completedAt: new Date("2024-01-15T09:02:30"),
    },
  });

  const batch2 = await prisma.importBatch.create({
    data: {
      organizationId: org1.id,
      importedById: member1.id,
      source: "ANDROID_BACKUP",
      status: "COMPLETED",
      fileName: "android_backup_feb.csv",
      fileSize: 102400,
      totalRows: 300,
      successRows: 300,
      failedRows: 0,
      startedAt: new Date("2024-02-01T10:00:00"),
      completedAt: new Date("2024-02-01T10:01:15"),
    },
  });

  // ============================================================
  // CALL LOGS (1000+ records)
  // ============================================================

  console.log("Creating 1000+ call log records...");
  const callTypes = ["INCOMING", "OUTGOING", "MISSED"];
  const simSlots = ["SIM_1", "SIM_2"];
  const callLogsData = [];

  for (let i = 0; i < 1000; i++) {
    const callType = Math.random() < 0.15 ? "MISSED" : randomFrom(["INCOMING", "OUTGOING"]);
    const importedBy = randomFrom([owner, admin, member1, member2]);
    const batch = randomFrom([batch1, batch2, null]);

    callLogsData.push({
      organizationId: org1.id,
      importedById: importedBy.id,
      importBatchId: batch?.id ?? null,
      mobileNumber: randomFrom(INDIAN_NUMBERS),
      contactName: randomFrom(CONTACT_NAMES),
      callType,
      date: randomDate(90),
      duration: callType === "MISSED" ? 0 : randomInt(30, 1800),
      simSlot: randomFrom(simSlots),
      deviceName: randomFrom(DEVICES),
      isImportant: Math.random() < 0.05,
    });
  }

  // Batch insert
  await prisma.callLog.createMany({ data: callLogsData });

  // Get all call log IDs for relations
  const callLogs = await prisma.callLog.findMany({
    where: { organizationId: org1.id },
    select: { id: true },
    take: 100,
  });

  // ============================================================
  // NOTES on some calls
  // ============================================================

  console.log("Adding notes to calls...");
  const noteContents = [
    "Follow up regarding the project proposal",
    "Client asked for a callback tomorrow morning",
    "Discussed pricing — send quotation by EOD",
    "Vendor call — confirm delivery schedule",
    "Missed call — need to call back urgently",
    "Regular check-in call",
    "Support issue resolved on call",
  ];

  for (let i = 0; i < 50; i++) {
    const call = randomFrom(callLogs);
    const author = randomFrom([owner, admin, member1, member2]);
    await prisma.callNote.create({
      data: {
        callLogId: call.id,
        authorId: author.id,
        content: randomFrom(noteContents),
      },
    });
  }

  // ============================================================
  // TAGS on some calls
  // ============================================================

  console.log("Applying tags to calls...");
  for (let i = 0; i < 200; i++) {
    const call = randomFrom(callLogs);
    const tag = randomFrom(tags);
    await prisma.callLogTag.upsert({
      where: { callLogId_tagId: { callLogId: call.id, tagId: tag.id } },
      create: { callLogId: call.id, tagId: tag.id },
      update: {},
    });
  }

  // ============================================================
  // FOLLOW-UP TASKS
  // ============================================================

  console.log("Creating follow-up tasks...");
  const taskTitles = [
    "Call back Rahul Sharma — pending quote",
    "Send invoice to client 9876543210",
    "Follow up with vendor regarding delivery",
    "Escalate support ticket — 3rd missed call",
    "Schedule meeting with Priya Patel",
    "Update contact details for Vijay Verma",
    "Prepare call log report for management",
    "Review SIM 2 unusual activity",
    "Set up automatic missed call notification",
    "Archive old call records from Q1",
    "Verify recording links for compliance",
    "Export monthly report to PDF",
    "Add new team member — Anita Gupta",
    "Check peak hour coverage on weekends",
    "Migrate call logs from old system",
    "Train new team member on import process",
    "Update vendor contact — number changed",
    "Respond to client complaint",
    "Renew API integration credentials",
    "Audit call log access permissions",
  ];

  const statuses = ["PENDING", "IN_PROGRESS", "DONE", "CANCELLED"];
  const priorities = ["URGENT", "HIGH", "MEDIUM", "LOW"];

  for (let i = 0; i < 20; i++) {
    const linkedCall = i < 10 ? randomFrom(callLogs) : null;
    const assignee = randomFrom([owner, admin, member1, member2]);
    const creator = randomFrom([owner, admin]);

    const task = await prisma.followUpTask.create({
      data: {
        organizationId: org1.id,
        title: taskTitles[i],
        description: `Auto-generated task for: ${taskTitles[i]}`,
        status: randomFrom(statuses),
        priority: randomFrom(priorities),
        dueDate: randomDate(30),
        assigneeId: assignee.id,
        linkedCallId: linkedCall?.id ?? null,
        createdById: creator.id,
      },
    });

    // Add comment to each task
    await prisma.taskComment.create({
      data: {
        taskId: task.id,
        authorId: creator.id,
        content: "Started working on this. Will update by EOD.",
      },
    });

    // Add watcher
    await prisma.taskWatcher.create({
      data: { taskId: task.id, userId: owner.id },
    });
  }

  // ============================================================
  // NOTIFICATIONS
  // ============================================================

  console.log("Creating notifications...");
  const notifData = [
    { type: "MISSED_CALL", title: "Missed Call", body: "Missed call from 9876543210 (Rahul Sharma)", isRead: false },
    { type: "IMPORT_COMPLETED", title: "Import Completed", body: "498 records imported from calls_january_2024.csv", isRead: true },
    { type: "TASK_ASSIGNED", title: "Task Assigned", body: "Arjun Mehta assigned you: Call back Rahul Sharma", isRead: false },
    { type: "MISSED_CALL", title: "Missed Call", body: "Missed call from 9123456789", isRead: false },
    { type: "TASK_DUE_SOON", title: "Task Due Soon", body: "Send invoice to client — due in 2 hours", isRead: false },
    { type: "IMPORT_COMPLETED", title: "Import Completed", body: "300 records imported from android_backup_feb.csv", isRead: true },
    { type: "COMMENT_ADDED", title: "New Comment", body: "Priya Sharma commented on your task", isRead: true },
    { type: "USER_INVITED", title: "Team Invitation", body: "You invited guest@demo.com to Demo Corp", isRead: true },
  ];

  for (const n of notifData) {
    await prisma.notification.create({
      data: {
        organizationId: org1.id,
        userId: owner.id,
        type: n.type as any,
        title: n.title,
        body: n.body,
        isRead: n.isRead,
      },
    });
  }

  // ============================================================
  // AUDIT LOGS
  // ============================================================

  console.log("Creating audit trail...");
  const auditEvents = [
    { action: "import_completed", entityType: "import_batch", entityId: batch1.id, metadata: { source: "CSV", successRows: 498 } },
    { action: "import_completed", entityType: "import_batch", entityId: batch2.id, metadata: { source: "ANDROID_BACKUP", successRows: 300 } },
    { action: "user_invited", entityType: "user", entityId: guest.id, metadata: { email: "guest@demo.com", role: "GUEST" } },
    { action: "tag_created", entityType: "tag", entityId: tags[0].id, metadata: { name: "Office" } },
    { action: "settings_changed", entityType: "organization", entityId: org1.id, metadata: { event: "organization_created" } },
  ];

  for (const event of auditEvents) {
    await prisma.auditLog.create({
      data: {
        organizationId: org1.id,
        actorId: owner.id,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        metadata: JSON.stringify(event.metadata),
      },
    });
  }

  console.log("\n✅ Seed complete!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Demo Accounts:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Owner   → admin@demo.com   / Admin1234");
  console.log("Admin   → manager@demo.com / Admin1234");
  console.log("Member  → member1@demo.com / Admin1234");
  console.log("Member  → member2@demo.com / Admin1234");
  console.log("Guest   → guest@demo.com   / Admin1234");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`\n📊 Created:`);
  console.log(`  • 2 Organizations`);
  console.log(`  • 5 Users`);
  console.log(`  • 8 Tags`);
  console.log(`  • 2 Import Batches`);
  console.log(`  • 1000+ Call Logs`);
  console.log(`  • 50 Notes`);
  console.log(`  • 200 Tag assignments`);
  console.log(`  • 20 Follow-up Tasks`);
  console.log(`  • 8 Notifications`);
  console.log(`  • 5 Audit Logs`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
