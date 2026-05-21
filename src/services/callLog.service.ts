// src/services/callLog.service.ts
// Call Log Business Logic — all DB operations for call logs

import prisma from "@/lib/prisma";
import type { CallLogFiltersInput, CreateCallLogInput } from "@/lib/validation";
import { buildPrismaParams, buildPaginatedResult } from "@/lib/pagination";
import { AuditService } from "./audit.service";
import { NotificationService } from "./notification.service";

export class CallLogService {
  // =============================================================
  // CREATE
  // =============================================================

  static async create(
    organizationId: string,
    userId: string,
    data: CreateCallLogInput,
    ipAddress?: string
  ) {
    const { tagIds, notes, ...callData } = data;

    const callLogDate = new Date(callData.date);
    callLogDate.setMilliseconds(0);

    const callLog = await prisma.callLog.create({
      data: {
        ...callData,
        date: callLogDate,
        organizationId,
        importedById: userId,
        // Create note inline if provided
        notes: notes
          ? {
              create: {
                content: notes,
                authorId: userId,
              },
            }
          : undefined,
        // Apply tags
        tags: tagIds?.length
          ? {
              create: tagIds.map((tagId) => ({ tagId })),
            }
          : undefined,
      },
      include: {
        importedBy: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        notes: { include: { author: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        tags: { include: { tag: true } },
      },
    });

    // Notify org members if missed call
    if (data.callType === "MISSED") {
      const members = await prisma.organizationMember.findMany({
        where: {
          organizationId,
          role: { in: ["OWNER", "ADMIN"] },
          NOT: { userId },
        },
        select: { userId: true },
      });
      await NotificationService.notifyMissedCall(
        organizationId,
        members.map((m) => m.userId),
        callLog.id,
        data.mobileNumber,
        data.contactName
      );
    }

    await AuditService.log({
      organizationId,
      actorId: userId,
      action: "call_manually_added",
      entityType: "call_log",
      entityId: callLog.id,
      metadata: { callType: data.callType, mobileNumber: data.mobileNumber },
      ipAddress,
    });

    return callLog;
  }

  // =============================================================
  // LIST (with filters + cursor pagination)
  // =============================================================

  static async list(
    organizationId: string,
    filters: CallLogFiltersInput
  ) {
    const {
      mobileNumber, contactName, callType, dateFrom, dateTo,
      durationMin, durationMax, userId, tagIds: tagIdsStr,
      simSlot, isImportant, hasNotes, hasRecording, search,
      sortBy = "date", sortOrder = "desc", cursor, limit = 50,
    } = filters;

    const tagIds = tagIdsStr ? tagIdsStr.split(",").filter(Boolean) : undefined;

    const where: any = {
      organizationId,
      deletedAt: null,
      ...(mobileNumber ? { mobileNumber: { contains: mobileNumber } } : {}),
      ...(contactName ? { contactName: { contains: contactName } } : {}),
      ...(callType && callType !== "ALL" ? { callType } : {}),
      ...(dateFrom || dateTo
        ? {
            date: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
      ...(durationMin !== undefined || durationMax !== undefined
        ? {
            duration: {
              ...(durationMin !== undefined ? { gte: durationMin } : {}),
              ...(durationMax !== undefined ? { lte: durationMax } : {}),
            },
          }
        : {}),
      ...(userId ? { importedById: userId } : {}),
      ...(simSlot ? { simSlot } : {}),
      ...(isImportant !== undefined ? { isImportant } : {}),
      ...(hasNotes !== undefined
        ? hasNotes
          ? { notes: { some: {} } }
          : { notes: { none: {} } }
        : {}),
      ...(hasRecording !== undefined
        ? hasRecording
          ? { recordingLink: { not: null } }
          : { recordingLink: null }
        : {}),
      ...(search
        ? {
            OR: [
              { mobileNumber: { contains: search } },
              { contactName: { contains: search } },
              { notes: { some: { content: { contains: search } } } },
            ],
          }
        : {}),
      ...(tagIds?.length
        ? { tags: { some: { tagId: { in: tagIds } } } }
        : {}),
    };

    const orderByMap: Record<string, string> = {
      date: "date",
      duration: "duration",
      mobileNumber: "mobileNumber",
      contactName: "contactName",
    };

    const [items, total] = await Promise.all([
      prisma.callLog.findMany({
        where,
        include: {
          importedBy: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          notes: {
            include: { author: { select: { id: true, name: true, email: true, avatarUrl: true } } },
            orderBy: { createdAt: "desc" },
            take: 3,
          },
          tags: { include: { tag: true } },
          _count: { select: { notes: true, tasks: true } },
        },
        orderBy: { [orderByMap[sortBy]]: sortOrder },
        take: limit + 1,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      }),
      prisma.callLog.count({ where }),
    ]);

    return buildPaginatedResult(items, limit, total);
  }

  // =============================================================
  // GET ONE
  // =============================================================

  static async getById(id: string, organizationId: string) {
    return prisma.callLog.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        importedBy: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        notes: {
          include: { author: { select: { id: true, name: true, email: true, avatarUrl: true } } },
          orderBy: { createdAt: "desc" },
        },
        tags: { include: { tag: true } },
        tasks: {
          where: { deletedAt: null },
          include: {
            assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        importBatch: {
          select: { id: true, source: true, status: true, fileName: true, createdAt: true },
        },
      },
    });
  }

  // =============================================================
  // UPDATE
  // =============================================================

  static async update(
    id: string,
    organizationId: string,
    actorId: string,
    data: Partial<CreateCallLogInput>,
    ipAddress?: string
  ) {
    const existing = await CallLogService.getById(id, organizationId);
    if (!existing) throw new Error("Call log not found");

    const { tagIds, notes, ...updateData } = data;

    const updated = await prisma.callLog.update({
      where: { id },
      data: {
        ...updateData,
        ...(updateData.date ? { date: new Date(updateData.date) } : {}),
      },
      include: {
        importedBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
        notes: { include: { author: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        tags: { include: { tag: true } },
      },
    });

    await AuditService.log({
      organizationId,
      actorId,
      action: "call_edited",
      entityType: "call_log",
      entityId: id,
      metadata: { changes: updateData },
      ipAddress,
    });

    return updated;
  }

  // =============================================================
  // SOFT DELETE
  // =============================================================

  static async softDelete(
    id: string,
    organizationId: string,
    actorId: string,
    ipAddress?: string
  ) {
    await prisma.callLog.updateMany({
      where: { id, organizationId },
      data: { deletedAt: new Date() },
    });

    await AuditService.log({
      organizationId,
      actorId,
      action: "call_deleted",
      entityType: "call_log",
      entityId: id,
      metadata: {},
      ipAddress,
    });
  }

  // =============================================================
  // TOGGLE IMPORTANT
  // =============================================================

  static async toggleImportant(
    id: string,
    organizationId: string,
    actorId: string
  ) {
    const existing = await prisma.callLog.findFirst({
      where: { id, organizationId },
      select: { isImportant: true },
    });
    if (!existing) throw new Error("Call log not found");

    const updated = await prisma.callLog.update({
      where: { id },
      data: { isImportant: !existing.isImportant },
    });

    await AuditService.log({
      organizationId,
      actorId,
      action: "call_marked_important",
      entityType: "call_log",
      entityId: id,
      metadata: { isImportant: updated.isImportant },
    });

    return updated;
  }

  // =============================================================
  // NOTES
  // =============================================================

  static async addNote(
    callLogId: string,
    organizationId: string,
    authorId: string,
    content: string
  ) {
    // Verify call belongs to org
    const call = await prisma.callLog.findFirst({
      where: { id: callLogId, organizationId, deletedAt: null },
    });
    if (!call) throw new Error("Call log not found");

    const note = await prisma.callNote.create({
      data: { callLogId, authorId, content },
      include: {
        author: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    await AuditService.log({
      organizationId,
      actorId: authorId,
      action: "note_added",
      entityType: "call_log",
      entityId: callLogId,
      metadata: { noteId: note.id },
    });

    return note;
  }

  static async updateNote(
    noteId: string,
    callLogId: string,
    organizationId: string,
    authorId: string,
    content: string
  ) {
    const call = await prisma.callLog.findFirst({
      where: { id: callLogId, organizationId },
    });
    if (!call) throw new Error("Call log not found");

    const note = await prisma.callNote.updateMany({
      where: { id: noteId, callLogId, authorId },
      data: { content },
    });

    return note;
  }

  static async deleteNote(
    noteId: string,
    callLogId: string,
    organizationId: string,
    authorId: string
  ) {
    const call = await prisma.callLog.findFirst({
      where: { id: callLogId, organizationId },
    });
    if (!call) throw new Error("Call log not found");

    await prisma.callNote.deleteMany({
      where: { id: noteId, callLogId, authorId },
    });
  }

  // =============================================================
  // TAGS
  // =============================================================

  static async applyTags(
    callLogId: string,
    organizationId: string,
    actorId: string,
    tagIds: string[]
  ) {
    const call = await prisma.callLog.findFirst({
      where: { id: callLogId, organizationId },
    });
    if (!call) throw new Error("Call log not found");

    // Remove all existing, then add new ones
    await prisma.callLogTag.deleteMany({ where: { callLogId } });

    if (tagIds.length > 0) {
      await prisma.callLogTag.createMany({
        data: tagIds.map((tagId) => ({ callLogId, tagId }))
      });
    }

    await AuditService.log({
      organizationId,
      actorId,
      action: "tag_applied",
      entityType: "call_log",
      entityId: callLogId,
      metadata: { tagIds },
    });
  }

  // =============================================================
  // BULK IMPORT (batch insert for performance)
  // =============================================================

  static async bulkCreate(
    organizationId: string,
    userId: string,
    batchId: string,
    records: Array<{
      mobileNumber: string;
      contactName?: string;
      callType: string;
      date: Date;
      duration: number;
      simSlot?: string;
      deviceName?: string;
      recordingLink?: string;
    }>
  ) {
    const BATCH_SIZE = 500;
    let successCount = 0;
    let failCount = 0;

    // 1. Standardize all incoming dates to seconds precision (reset milliseconds to 0)
    // This prevents database-specific millisecond rounding/truncation mismatches.
    const normalizedRecords = records.map((r) => {
      const d = new Date(r.date);
      d.setMilliseconds(0);
      return { ...r, date: d };
    });

    // 2. In-memory deduplication of the incoming batch to remove any duplicates in the payload itself
    const uniqueIncoming = [];
    const seenIncoming = new Set();
    for (const r of normalizedRecords) {
      const key = `${r.mobileNumber}_${r.date.getTime()}`;
      if (!seenIncoming.has(key)) {
        seenIncoming.add(key);
        uniqueIncoming.push(r);
      }
    }

    for (let i = 0; i < uniqueIncoming.length; i += BATCH_SIZE) {
      const chunk = uniqueIncoming.slice(i, i + BATCH_SIZE);
      try {
        // Query database to find which of these calls already exist in this organization
        const existingCalls = await prisma.callLog.findMany({
          where: {
            organizationId,
            mobileNumber: { in: chunk.map((r) => r.mobileNumber) },
            date: { in: chunk.map((r) => r.date) },
          },
          select: { mobileNumber: true, date: true },
        });

        const existingSet = new Set(
          existingCalls.map((c) => `${c.mobileNumber}_${c.date.getTime()}`)
        );

        // Filter out duplicate records
        const uniqueChunk = chunk.filter(
          (r) => !existingSet.has(`${r.mobileNumber}_${r.date.getTime()}`)
        );

        if (uniqueChunk.length > 0) {
          await prisma.callLog.createMany({
            data: uniqueChunk.map((r) => ({
              organizationId,
              importedById: userId,
              importBatchId: batchId,
              mobileNumber: r.mobileNumber,
              contactName: r.contactName ?? null,
              callType: r.callType,
              date: r.date,
              duration: r.duration,
              simSlot: r.simSlot ?? "UNKNOWN",
              deviceName: r.deviceName ?? null,
              recordingLink: r.recordingLink ?? null,
            })),
          });

          // 3. Post-sync SQL cleanup safeguard: Scoped query to delete any duplicate records for the synced numbers.
          // This prevents duplicates from concurrent sync requests (race conditions) on database level.
          const uniqueMobileNumbers = Array.from(new Set(uniqueChunk.map((r) => r.mobileNumber)));
          if (uniqueMobileNumbers.length > 0) {
            const sanitizedNumbers = uniqueMobileNumbers
              .map(num => `'${num.replace(/[^+\d]/g, "")}'`)
              .filter(num => num.length > 2)
              .join(",");

            if (sanitizedNumbers) {
              await prisma.$executeRawUnsafe(`
                DELETE FROM "CallLog"
                WHERE "organizationId" = '${organizationId}'
                  AND "mobileNumber" IN (${sanitizedNumbers})
                  AND "id" NOT IN (
                    SELECT MIN("id")
                    FROM "CallLog"
                    WHERE "organizationId" = '${organizationId}'
                      AND "mobileNumber" IN (${sanitizedNumbers})
                    GROUP BY "organizationId", "importedById", "mobileNumber", "date", "callType", "duration", "simSlot"
                  )
              `);
            }
          }
        }

        successCount += uniqueChunk.length;
        failCount += (chunk.length - uniqueChunk.length);
      } catch (err) {
        console.error("Bulk insert failed for chunk", err);
        failCount += chunk.length;
      }
    }

    return { successCount, failCount };
  }
}
