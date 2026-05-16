// src/app/api/v1/organizations/[orgId]/import/route.ts
import { NextRequest } from "next/server";
import { withAuth, apiSuccess, apiError } from "@/lib/middleware";
import { ImportService } from "@/services/import.service";
import { AuditService } from "@/services/audit.service";

// POST /api/v1/organizations/:orgId/import
// Accepts multipart/form-data with file + source fields
export const POST = withAuth(async (req, ctx) => {
  if (ctx.role === "GUEST") {
    return apiError("FORBIDDEN", "Guests cannot import call logs", 403);
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const source = (formData.get("source") as string) || "CSV";

    if (!file) {
      return apiError("BAD_REQUEST", "No file provided", 400);
    }

    const allowedSources = ["CSV", "EXCEL", "ANDROID_BACKUP"];
    if (!allowedSources.includes(source)) {
      return apiError("BAD_REQUEST", `Invalid source. Allowed: ${allowedSources.join(", ")}`, 400);
    }

    const MAX_SIZE = 20 * 1024 * 1024; // 20MB
    if (file.size > MAX_SIZE) {
      return apiError("FILE_TOO_LARGE", "File size exceeds 20MB limit", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Create import batch record
    const batch = await ImportService.createBatch(
      ctx.organizationId,
      ctx.user.id,
      source,
      file.name,
      file.size
    );

    await AuditService.log({
      organizationId: ctx.organizationId,
      actorId: ctx.user.id,
      action: "import_started",
      entityType: "import_batch",
      entityId: batch.id,
      metadata: { source, fileName: file.name, fileSize: file.size },
    });

    // Parse file based on source
    let records;
    try {
      if (source === "CSV") {
        records = await ImportService.parseCSV(buffer);
      } else if (source === "EXCEL") {
        records = await ImportService.parseExcel(buffer);
      } else if (source === "ANDROID_BACKUP") {
        records = await ImportService.parseAndroidBackup(buffer);
      } else {
        records = [];
      }
    } catch (parseError: any) {
      return apiError("PARSE_ERROR", `Failed to parse file: ${parseError.message}`, 400);
    }

    if (records.length === 0) {
      return apiError("EMPTY_FILE", "No valid records found in the file", 400);
    }

    // For files <= 1000 rows, process inline
    // For larger files, process inline too (in production use a queue worker)
    const result = await ImportService.processBatch(
      batch.id,
      ctx.organizationId,
      ctx.user.id,
      records
    );

    return apiSuccess({
      batchId: batch.id,
      totalRows: records.length,
      successRows: result.successCount,
      failedRows: result.failCount,
      status: "COMPLETED",
    }, 201);
  } catch (error: any) {
    console.error("[POST /import]", error);
    return apiError("IMPORT_FAILED", error.message || "Import failed", 500);
  }
}, "MEMBER");

// GET /api/v1/organizations/:orgId/import — list import batches
export const GET = withAuth(async (req, ctx) => {
  const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "20");

  const result = await ImportService.getBatches(ctx.organizationId, { cursor, limit });
  return apiSuccess(result);
});
