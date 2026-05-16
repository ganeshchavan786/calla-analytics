// src/services/notification.service.ts
// Notification Service — create, deliver, manage notifications

import prisma from "@/lib/prisma";
import type { NotificationType } from "@/types";

export interface CreateNotificationParams {
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

export class NotificationService {
  // Create a single notification
  static async create(params: CreateNotificationParams) {
    return prisma.notification.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        link: params.link ?? null,
      },
    });
  }

  // Create notifications for multiple users
  static async createForMany(
    userIds: string[],
    params: Omit<CreateNotificationParams, "userId">
  ) {
    if (userIds.length === 0) return;

    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        organizationId: params.organizationId,
        userId,
        type: params.type,
        title: params.title,
        body: params.body,
        link: params.link ?? null,
      })),
    });
  }

  // Get unread count for a user
  static async getUnreadCount(
    userId: string,
    organizationId: string
  ): Promise<number> {
    return prisma.notification.count({
      where: { userId, organizationId, isRead: false },
    });
  }

  // Get notifications for a user (paginated)
  static async getForUser(
    userId: string,
    organizationId: string,
    options: { cursor?: string; limit?: number } = {}
  ) {
    const limit = options.limit ?? 25;

    const notifications = await prisma.notification.findMany({
      where: { userId, organizationId },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(options.cursor
        ? { skip: 1, cursor: { id: options.cursor } }
        : {}),
    });

    const hasMore = notifications.length > limit;
    const data = hasMore ? notifications.slice(0, limit) : notifications;

    return {
      data,
      nextCursor: hasMore ? data[data.length - 1].id : null,
      hasMore,
      unreadCount: await NotificationService.getUnreadCount(userId, organizationId),
    };
  }

  // Mark as read
  static async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<void> {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  // Mark all as read
  static async markAllAsRead(
    userId: string,
    organizationId: string
  ): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, organizationId, isRead: false },
      data: { isRead: true },
    });
  }

  // =============================================================
  // DOMAIN-SPECIFIC NOTIFICATION CREATORS
  // =============================================================

  static async notifyMissedCall(
    orgId: string,
    memberIds: string[],
    callId: string,
    mobileNumber: string,
    contactName?: string | null
  ) {
    const caller = contactName || mobileNumber;
    await NotificationService.createForMany(memberIds, {
      organizationId: orgId,
      type: "MISSED_CALL",
      title: "Missed Call",
      body: `Missed call from ${caller}`,
      link: `/call-logs/${callId}`,
    });
  }

  static async notifyImportCompleted(
    orgId: string,
    userId: string,
    batchId: string,
    successRows: number,
    failedRows: number
  ) {
    await NotificationService.create({
      organizationId: orgId,
      userId,
      type: "IMPORT_COMPLETED",
      title: "Import Completed",
      body: `${successRows} records imported successfully${failedRows > 0 ? `, ${failedRows} failed` : ""}.`,
      link: `/call-logs?batchId=${batchId}`,
    });
  }

  static async notifyImportFailed(
    orgId: string,
    userId: string,
    batchId: string,
    error: string
  ) {
    await NotificationService.create({
      organizationId: orgId,
      userId,
      type: "IMPORT_FAILED",
      title: "Import Failed",
      body: `Import failed: ${error}`,
      link: `/call-logs?batchId=${batchId}`,
    });
  }

  static async notifyTaskAssigned(
    orgId: string,
    assigneeId: string,
    taskId: string,
    taskTitle: string,
    assignerName: string
  ) {
    await NotificationService.create({
      organizationId: orgId,
      userId: assigneeId,
      type: "TASK_ASSIGNED",
      title: "Task Assigned to You",
      body: `${assignerName} assigned you: "${taskTitle}"`,
      link: `/tasks/${taskId}`,
    });
  }

  static async notifyTaskDueSoon(
    orgId: string,
    assigneeId: string,
    taskId: string,
    taskTitle: string,
    hoursLeft: number
  ) {
    await NotificationService.create({
      organizationId: orgId,
      userId: assigneeId,
      type: "TASK_DUE_SOON",
      title: "Task Due Soon",
      body: `"${taskTitle}" is due in ${hoursLeft} hours`,
      link: `/tasks/${taskId}`,
    });
  }

  static async notifyUserInvited(
    orgId: string,
    invitedUserId: string,
    orgName: string,
    inviterName: string
  ) {
    await NotificationService.create({
      organizationId: orgId,
      userId: invitedUserId,
      type: "USER_INVITED",
      title: "Organization Invitation",
      body: `${inviterName} invited you to join ${orgName}`,
      link: `/settings/members`,
    });
  }
}
