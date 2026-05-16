// src/services/import.service.ts
// Import Service — parse CSV, Excel, Android backup files

import prisma from "@/lib/prisma";
import { CallLogService } from "./callLog.service";
import { AuditService } from "./audit.service";
import { NotificationService } from "./notification.service";
import type { ParsedCallRecord } from "@/types";

export class ImportService {
  // =============================================================
  // CREATE BATCH
  // =============================================================

  static async createBatch(
    organizationId: string,
    userId: string,
    source: string,
    fileName?: string,
    fileSize?: number
  ) {
    return prisma.importBatch.create({
      data: {
        organizationId,
        importedById: userId,
        source,
        status: "PENDING",
        fileName: fileName ?? null,
        fileSize: fileSize ?? null,
      },
    });
  }

  // =============================================================
  // PROCESS BATCH (called by worker or inline for small files)
  // =============================================================

  static async processBatch(
    batchId: string,
    organizationId: string,
    userId: string,
    records: ParsedCallRecord[]
  ) {
    // Mark as processing
    await prisma.importBatch.update({
      where: { id: batchId },
      data: { status: "PROCESSING", startedAt: new Date(), totalRows: records.length },
    });

    try {
      const { successCount, failCount } = await CallLogService.bulkCreate(
        organizationId,
        userId,
        batchId,
        records
      );

      await prisma.importBatch.update({
        where: { id: batchId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          successRows: successCount,
          failedRows: failCount,
        },
      });

      await AuditService.log({
        organizationId,
        actorId: userId,
        action: "import_completed",
        entityType: "import_batch",
        entityId: batchId,
        metadata: { totalRows: records.length, successCount, failCount },
      });

      await NotificationService.notifyImportCompleted(
        organizationId, userId, batchId, successCount, failCount
      );

      return { success: true, successCount, failCount };
    } catch (error: any) {
      await prisma.importBatch.update({
        where: { id: batchId },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          errorLog: error.message,
        },
      });

      await NotificationService.notifyImportFailed(
        organizationId, userId, batchId, error.message
      );

      throw error;
    }
  }

  // =============================================================
  // PARSE CSV
  // =============================================================

  static async parseCSV(buffer: Buffer): Promise<ParsedCallRecord[]> {
    const { parse } = await import("csv-parse/sync");

    const rows = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];

    return rows.map((row) => ImportService.normalizeRow(row)).filter(Boolean) as ParsedCallRecord[];
  }

  // =============================================================
  // PARSE EXCEL
  // =============================================================

  static async parseExcel(buffer: Buffer): Promise<ParsedCallRecord[]> {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];

    return rows.map((row) => ImportService.normalizeRow(row)).filter(Boolean) as ParsedCallRecord[];
  }

  // =============================================================
  // PARSE ANDROID BACKUP CSV
  // Android backup format: Number,Name,Type,Date,Duration,Formatted Duration
  // =============================================================

  static async parseAndroidBackup(buffer: Buffer): Promise<ParsedCallRecord[]> {
    const { parse } = await import("csv-parse/sync");

    const rows = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];

    return rows
      .map((row): ParsedCallRecord | null => {
        try {
          const typeRaw = (row["Type"] || row["type"] || "").toLowerCase();
          const callType = typeRaw.includes("incoming") || typeRaw === "1"
            ? "INCOMING"
            : typeRaw.includes("outgoing") || typeRaw === "2"
            ? "OUTGOING"
            : typeRaw.includes("missed") || typeRaw === "3"
            ? "MISSED"
            : "INCOMING";

          const durationRaw = row["Duration"] || row["duration"] || "0";
          const duration = parseInt(durationRaw.toString().replace(/\D/g, "")) || 0;

          const dateRaw = row["Date"] || row["date"] || "";
          const date = dateRaw ? new Date(dateRaw) : new Date();

          if (isNaN(date.getTime())) return null;

          return {
            mobileNumber: (row["Number"] || row["number"] || "").trim(),
            contactName: (row["Name"] || row["name"] || "").trim() || undefined,
            callType: callType as ParsedCallRecord["callType"],
            date,
            duration,
          };
        } catch {
          return null;
        }
      })
      .filter((r): r is ParsedCallRecord => r !== null && r.mobileNumber.length > 0);
  }

  // =============================================================
  // NORMALIZE ROW (generic CSV/Excel column mapping)
  // Handles various column name formats
  // =============================================================

  static normalizeRow(row: Record<string, any>): ParsedCallRecord | null {
    try {
      // Try multiple column name variations
      const mobileNumber = (
        row["mobileNumber"] ||
        row["mobile_number"] ||
        row["Mobile Number"] ||
        row["phone"] ||
        row["Phone"] ||
        row["number"] ||
        row["Number"] ||
        ""
      ).toString().trim();

      if (!mobileNumber || mobileNumber.length < 7) return null;

      const callTypeRaw = (
        row["callType"] || row["call_type"] || row["Call Type"] ||
        row["type"] || row["Type"] || "incoming"
      ).toString().toLowerCase();

      const callType: ParsedCallRecord["callType"] =
        callTypeRaw.includes("out") ? "OUTGOING"
        : callTypeRaw.includes("miss") ? "MISSED"
        : "INCOMING";

      const dateRaw =
        row["date"] || row["Date"] || row["datetime"] || row["DateTime"] || "";
      const date = dateRaw ? new Date(dateRaw) : new Date();
      if (isNaN(date.getTime())) return null;

      const durationRaw =
        row["duration"] || row["Duration"] || row["duration_seconds"] || "0";
      const duration = parseInt(durationRaw.toString().replace(/\D/g, "")) || 0;

      return {
        mobileNumber,
        contactName: (
          row["contactName"] || row["contact_name"] ||
          row["Contact Name"] || row["name"] || row["Name"] || ""
        ).toString().trim() || undefined,
        callType,
        date,
        duration,
        simSlot: normalizeSimSlot(
          row["simSlot"] || row["sim_slot"] || row["SIM"] || row["sim"] || ""
        ),
        deviceName: (
          row["deviceName"] || row["device_name"] ||
          row["Device"] || row["device"] || ""
        ).toString().trim() || undefined,
        recordingLink: (
          row["recordingLink"] || row["recording_link"] ||
          row["Recording"] || row["recording"] || ""
        ).toString().trim() || undefined,
        notes: (row["notes"] || row["Notes"] || "").toString().trim() || undefined,
      };
    } catch {
      return null;
    }
  }

  // =============================================================
  // GET BATCH LIST
  // =============================================================

  static async getBatches(
    organizationId: string,
    options: { cursor?: string; limit?: number } = {}
  ) {
    const limit = options.limit ?? 20;

    const batches = await prisma.importBatch.findMany({
      where: { organizationId },
      include: {
        importedBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
        _count: { select: { callLogs: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(options.cursor ? { skip: 1, cursor: { id: options.cursor } } : {}),
    });

    const hasMore = batches.length > limit;
    const data = hasMore ? batches.slice(0, limit) : batches;

    return {
      data,
      nextCursor: hasMore ? data[data.length - 1].id : null,
      hasMore,
    };
  }

  // =============================================================
  // GET BATCH BY ID
  // =============================================================

  static async getBatchById(batchId: string, organizationId: string) {
    return prisma.importBatch.findFirst({
      where: { id: batchId, organizationId },
      include: {
        importedBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
        _count: { select: { callLogs: true } },
      },
    });
  }
}

// =============================================================
// HELPERS
// =============================================================

function normalizeSimSlot(raw: string): ParsedCallRecord["simSlot"] {
  const s = raw.toString().toLowerCase();
  if (s.includes("1") || s === "sim1" || s === "sim_1") return "SIM_1";
  if (s.includes("2") || s === "sim2" || s === "sim_2") return "SIM_2";
  return "UNKNOWN";
}
