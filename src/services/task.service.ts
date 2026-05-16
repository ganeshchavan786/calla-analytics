// src/services/task.service.ts
// Follow-up Task Service

import prisma from "@/lib/prisma";
import { AuditService } from "./audit.service";
import { NotificationService } from "./notification.service";
import type { CreateTaskInput, UpdateTaskInput } from "@/lib/validation";

export class TaskService {
  static async create(
    organizationId: string,
    createdById: string,
    data: CreateTaskInput,
    ipAddress?: string
  ) {
    const task = await prisma.followUpTask.create({
      data: {
        organizationId,
        createdById,
        title: data.title,
        description: data.description ?? null,
        status: data.status ?? "PENDING",
        priority: data.priority ?? "MEDIUM",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        assigneeId: data.assigneeId ?? null,
        linkedCallId: data.linkedCallId ?? null,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
        createdBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
        linkedCall: true,
      },
    });

    // Notify assignee
    if (data.assigneeId && data.assigneeId !== createdById) {
      const creator = await prisma.user.findUnique({
        where: { id: createdById },
        select: { name: true },
      });
      await NotificationService.notifyTaskAssigned(
        organizationId,
        data.assigneeId,
        task.id,
        task.title,
        creator?.name ?? "Someone"
      );
    }

    await AuditService.log({
      organizationId,
      actorId: createdById,
      action: "task_created",
      entityType: "task",
      entityId: task.id,
      metadata: { title: task.title, linkedCallId: data.linkedCallId },
      ipAddress,
    });

    return task;
  }

  static async list(
    organizationId: string,
    options: {
      status?: string;
      priority?: string;
      assigneeId?: string;
      linkedCallId?: string;
      cursor?: string;
      limit?: number;
    } = {}
  ) {
    const limit = options.limit ?? 25;

    const where: any = {
      organizationId,
      deletedAt: null,
      ...(options.status ? { status: options.status } : {}),
      ...(options.priority ? { priority: options.priority } : {}),
      ...(options.assigneeId ? { assigneeId: options.assigneeId } : {}),
      ...(options.linkedCallId ? { linkedCallId: options.linkedCallId } : {}),
    };

    const [tasks, total] = await Promise.all([
      prisma.followUpTask.findMany({
        where,
        include: {
          assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
          createdBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
          linkedCall: { select: { id: true, mobileNumber: true, contactName: true, callType: true } },
          _count: { select: { comments: true, attachments: true } },
        },
        orderBy: [{ priority: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
        take: limit + 1,
        ...(options.cursor ? { skip: 1, cursor: { id: options.cursor } } : {}),
      }),
      prisma.followUpTask.count({ where }),
    ]);

    const hasMore = tasks.length > limit;
    const data = hasMore ? tasks.slice(0, limit) : tasks;

    return {
      data,
      nextCursor: hasMore ? data[data.length - 1].id : null,
      hasMore,
      total,
    };
  }

  static async getById(id: string, organizationId: string) {
    return prisma.followUpTask.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
        createdBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
        linkedCall: true,
        comments: {
          include: { author: { select: { id: true, name: true, email: true, avatarUrl: true } } },
          orderBy: { createdAt: "asc" },
        },
        watchers: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        attachments: true,
      },
    });
  }

  static async update(
    id: string,
    organizationId: string,
    actorId: string,
    data: UpdateTaskInput,
    ipAddress?: string
  ) {
    const existing = await prisma.followUpTask.findFirst({
      where: { id, organizationId },
      select: { status: true, assigneeId: true, title: true },
    });
    if (!existing) throw new Error("Task not found");

    const updated = await prisma.followUpTask.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.dueDate !== undefined ? { dueDate: data.dueDate ? new Date(data.dueDate) : null } : {}),
        ...(data.assigneeId !== undefined ? { assigneeId: data.assigneeId } : {}),
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    // If status changed, log specifically
    const action = data.status && data.status !== existing.status
      ? "task_status_changed"
      : "task_updated";

    await AuditService.log({
      organizationId,
      actorId,
      action,
      entityType: "task",
      entityId: id,
      metadata: {
        changes: data,
        previousStatus: existing.status,
      },
      ipAddress,
    });

    // Notify new assignee
    if (data.assigneeId && data.assigneeId !== existing.assigneeId && data.assigneeId !== actorId) {
      const actor = await prisma.user.findUnique({
        where: { id: actorId },
        select: { name: true },
      });
      await NotificationService.notifyTaskAssigned(
        organizationId,
        data.assigneeId,
        id,
        existing.title,
        actor?.name ?? "Someone"
      );
    }

    return updated;
  }

  static async softDelete(
    id: string,
    organizationId: string,
    actorId: string
  ) {
    await prisma.followUpTask.updateMany({
      where: { id, organizationId },
      data: { deletedAt: new Date() },
    });

    await AuditService.log({
      organizationId,
      actorId,
      action: "task_deleted",
      entityType: "task",
      entityId: id,
      metadata: {},
    });
  }

  // =============================================================
  // COMMENTS
  // =============================================================

  static async addComment(
    taskId: string,
    organizationId: string,
    authorId: string,
    content: string
  ) {
    const task = await prisma.followUpTask.findFirst({
      where: { id: taskId, organizationId, deletedAt: null },
      select: { id: true, title: true, watchers: { select: { userId: true } } },
    });
    if (!task) throw new Error("Task not found");

    const comment = await prisma.taskComment.create({
      data: { taskId, authorId, content },
      include: {
        author: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    // Notify watchers (except author)
    const watcherIds = task.watchers
      .map((w) => w.userId)
      .filter((id) => id !== authorId);

    if (watcherIds.length > 0) {
      const author = await prisma.user.findUnique({
        where: { id: authorId },
        select: { name: true },
      });
      await NotificationService.createForMany(watcherIds, {
        organizationId,
        type: "COMMENT_ADDED",
        title: "New Comment",
        body: `${author?.name} commented on "${task.title}"`,
        link: `/tasks/${taskId}`,
      });
    }

    return comment;
  }

  // =============================================================
  // WATCHERS
  // =============================================================

  static async addWatcher(taskId: string, organizationId: string, userId: string) {
    const task = await prisma.followUpTask.findFirst({
      where: { id: taskId, organizationId },
    });
    if (!task) throw new Error("Task not found");

    await prisma.taskWatcher.upsert({
      where: { taskId_userId: { taskId, userId } },
      create: { taskId, userId },
      update: {},
    });
  }

  static async removeWatcher(taskId: string, organizationId: string, userId: string) {
    await prisma.taskWatcher.deleteMany({ where: { taskId, userId } });
  }

  // =============================================================
  // KANBAN (grouped by status)
  // =============================================================

  static async getKanbanBoard(organizationId: string) {
    const statuses = ["PENDING", "IN_PROGRESS", "DONE", "CANCELLED"];

    const results = await Promise.all(
      statuses.map((status) =>
        prisma.followUpTask.findMany({
          where: { organizationId, status, deletedAt: null },
          include: {
            assignee: { select: { id: true, name: true, avatarUrl: true } },
            _count: { select: { comments: true } },
          },
          orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
          take: 50,
        })
      )
    );

    return {
      PENDING: results[0],
      IN_PROGRESS: results[1],
      DONE: results[2],
      CANCELLED: results[3],
    };
  }
}
