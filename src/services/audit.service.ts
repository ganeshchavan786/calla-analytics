// src/services/audit.service.ts
// Audit Log Service — immutable append-only action tracking

import prisma from "@/lib/prisma";

export interface AuditParams {
  organizationId: string;
  actorId: string;
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export type EntityType =
  | "call_log"
  | "task"
  | "user"
  | "import_batch"
  | "organization"
  | "tag"
  | "note"
  | "report";

export type AuditAction =
  | "call_imported"
  | "call_manually_added"
  | "call_edited"
  | "call_deleted"
  | "call_restored"
  | "call_marked_important"
  | "note_added"
  | "note_updated"
  | "note_deleted"
  | "tag_created"
  | "tag_applied"
  | "tag_removed"
  | "tag_deleted"
  | "task_created"
  | "task_updated"
  | "task_status_changed"
  | "task_assigned"
  | "task_deleted"
  | "task_comment_added"
  | "import_started"
  | "import_completed"
  | "import_failed"
  | "report_generated"
  | "report_exported"
  | "user_invited"
  | "user_joined"
  | "user_removed"
  | "role_changed"
  | "settings_changed"
  | "file_uploaded"
  | "file_deleted";

export class AuditService {
  // Log an action (fire-and-forget — never throws)
  static async log(params: AuditParams): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          organizationId: params.organizationId,
          actorId: params.actorId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          metadata: JSON.stringify(params.metadata ?? {}),
          ipAddress: params.ipAddress ?? null,
        },
      });
    } catch (err) {
      // Never let audit failures break the main flow
      console.error("[AuditService] Failed to log action:", err);
    }
  }

  // Get audit logs for an organization (paginated)
  static async getForOrganization(
    organizationId: string,
    options: {
      entityType?: string;
      entityId?: string;
      actorId?: string;
      cursor?: string;
      limit?: number;
    } = {}
  ) {
    const limit = options.limit ?? 50;

    const logs = await prisma.auditLog.findMany({
      where: {
        organizationId,
        ...(options.entityType ? { entityType: options.entityType } : {}),
        ...(options.entityId ? { entityId: options.entityId } : {}),
        ...(options.actorId ? { actorId: options.actorId } : {}),
      },
      include: {
        actor: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { timestamp: "desc" },
      take: limit + 1,
      ...(options.cursor
        ? { skip: 1, cursor: { id: options.cursor } }
        : {}),
    });

    const hasMore = logs.length > limit;
    const data = hasMore ? logs.slice(0, limit) : logs;

    return {
      data: data.map((log) => ({
        ...log,
        metadata: JSON.parse(log.metadata as string),
      })),
      nextCursor: hasMore ? data[data.length - 1].id : null,
      hasMore,
    };
  }

  // Get activity feed for a specific call log or task
  static async getEntityHistory(
    organizationId: string,
    entityType: string,
    entityId: string
  ) {
    const logs = await prisma.auditLog.findMany({
      where: { organizationId, entityType, entityId },
      include: {
        actor: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { timestamp: "desc" },
      take: 100,
    });

    return logs.map((log) => ({
      ...log,
      metadata: JSON.parse(log.metadata as string),
    }));
  }
}
