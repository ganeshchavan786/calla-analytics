// src/services/organization.service.ts — FINAL (with uniqueCode support)

import prisma from "@/lib/prisma";
import { AuditService } from "./audit.service";
import { generateUniqueCode } from "@/lib/code-generator";
import { sendInvitationEmail } from "@/lib/license-smtp";
import { randomUUID } from "crypto";

export class OrganizationService {

  static async create(userId: string, name: string, timezone = "UTC") {
    const slug = generateSlug(name);

    // Calculate trial expiry date: exactly 7 days from now
    const subEndDate = new Date();
    subEndDate.setDate(subEndDate.getDate() + 7);

    const org = await prisma.organization.create({
      data: {
        name,
        slug: await ensureUniqueSlug(slug),
        timezone,
        status: "ACTIVE",
        planType: "FREE_TRIAL",
        subscriptionEndDate: subEndDate,
        members: {
          create: { userId, role: "OWNER" },
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
      },
    });

    // Owner ला uniqueCode assign करा
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { uniqueCode: true },
    });
    if (!existing?.uniqueCode) {
      const ownerCode = await generateUniqueCode("OWNER");
      await prisma.user.update({
        where: { id: userId },
        data: { uniqueCode: ownerCode, codeType: "OWNER" },
      });
    }

    await AuditService.log({
      organizationId: org.id,
      actorId: userId,
      action: "settings_changed",
      entityType: "organization",
      entityId: org.id,
      metadata: { event: "organization_created", name },
    });

    return org;
  }

  static async getForUser(userId: string) {
    return prisma.organization.findMany({
      where: { members: { some: { userId } } },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        _count: { select: { callLogs: true, members: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  static async getById(id: string) {
    return prisma.organization.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        _count: { select: { callLogs: true, members: true, importBatches: true } },
      },
    });
  }

  static async update(
    id: string,
    actorId: string,
    data: { name?: string; timezone?: string; logoUrl?: string | null }
  ) {
    const org = await prisma.organization.update({ where: { id }, data });
    await AuditService.log({
      organizationId: id,
      actorId,
      action: "settings_changed",
      entityType: "organization",
      entityId: id,
      metadata: { changes: data },
    });
    return org;
  }

  static async getMembers(organizationId: string) {
    return prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true, name: true, email: true, avatarUrl: true,
            uniqueCode: true, codeType: true,
            registeredSIMs: {
              select: {
                simSlot: true,
                phoneNumber: true,
                deviceName: true,
                isActive: true,
                lastSyncAt: true,
                totalSynced: true,
              }
            }
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });
  }

  static async updateMemberRole(
    organizationId: string,
    targetUserId: string,
    newRole: string,
    actorId: string
  ) {
    const targetMember = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId: targetUserId } },
    });
    if (!targetMember) throw new Error("Member not found");
    if (targetMember.role === "OWNER") throw new Error("Cannot change Owner role");

    const updated = await prisma.organizationMember.update({
      where: { organizationId_userId: { organizationId, userId: targetUserId } },
      data: { role: newRole },
    });

    await AuditService.log({
      organizationId,
      actorId,
      action: "role_changed",
      entityType: "user",
      entityId: targetUserId,
      metadata: { previousRole: targetMember.role, newRole },
    });

    return updated;
  }

  static async removeMember(
    organizationId: string,
    targetUserId: string,
    actorId: string
  ) {
    const member = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId: targetUserId } },
    });
    if (!member) throw new Error("Member not found");
    if (member.role === "OWNER") throw new Error("Cannot remove the Owner");

    await prisma.organizationMember.delete({
      where: { organizationId_userId: { organizationId, userId: targetUserId } },
    });

    await AuditService.log({
      organizationId,
      actorId,
      action: "user_removed",
      entityType: "user",
      entityId: targetUserId,
      metadata: { removedRole: member.role },
    });
  }

  static async createInvite(
    organizationId: string,
    inviterUserId: string,
    email: string,
    role = "MEMBER"
  ) {
    // 1. Enforce Member Limits
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { planType: true, name: true },
    });
    
    if (!org) throw new Error("Organization not found");

    const memberCount = await prisma.organizationMember.count({
      where: { organizationId },
    });
    
    const pendingInvites = await prisma.invite.count({
      where: { organizationId, acceptedAt: null, expiresAt: { gt: new Date() } },
    });

    const totalCount = memberCount + pendingInvites;

    if (org.planType === "FREE_TRIAL" && totalCount >= 3) {
      throw new Error("Free Trial limit reached (Max 3 members). Please upgrade to a paid plan.");
    }
    
    if (org.planType === "ACTIVE_PAID" && totalCount >= 10) {
      throw new Error("Monthly plan limit reached (Max 10 members). Please upgrade to Enterprise.");
    }

    // 2. Check if user exists and is already a member
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const existing = await prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId: existingUser.id } },
      });
      if (existing) throw new Error("User is already a member");
    }

    await prisma.invite.updateMany({
      where: { organizationId, email, acceptedAt: null },
      data: { expiresAt: new Date() },
    });

    const invite = await prisma.invite.create({
      data: {
        email,
        role,
        token: randomUUID(),
        organizationId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await AuditService.log({
      organizationId,
      actorId: inviterUserId,
      action: "user_invited",
      entityType: "user",
      entityId: invite.id,
      metadata: { email, role },
    });

    // Send invitation email (fire and forget — never block invite creation)
    const inviter = await prisma.user.findUnique({
      where: { id: inviterUserId },
      select: { name: true },
    });

    sendInvitationEmail(
      email,
      inviter?.name || "Someone",
      org?.name || "the organization",
      role,
      invite.token
    ).catch((err: any) =>
      console.error("[Invitation Email Failed]", err.message)
    );

    return invite;
  }

  static async acceptInvite(token: string, userId: string) {
    const invite = await prisma.invite.findUnique({ where: { token } });
    if (!invite) throw new Error("Invalid invitation token");
    if (invite.acceptedAt) throw new Error("Invitation already accepted");
    if (invite.expiresAt < new Date()) throw new Error("Invitation has expired");

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, uniqueCode: true },
    });
    if (!user) throw new Error("User not found");
    if (user.email !== invite.email)
      throw new Error("This invitation was sent to a different email address");

    const membership = await prisma.organizationMember.create({
      data: {
        organizationId: invite.organizationId,
        userId,
        role: invite.role,
      },
    });

    await prisma.invite.update({
      where: { token },
      data: { acceptedAt: new Date() },
    });

    // Employee ला uniqueCode assign करा (नसेल तर)
    if (!user.uniqueCode) {
      const empCode = await generateUniqueCode("EMPLOYEE");
      await prisma.user.update({
        where: { id: userId },
        data: { uniqueCode: empCode, codeType: "EMPLOYEE" },
      });
    }

    await AuditService.log({
      organizationId: invite.organizationId,
      actorId: userId,
      action: "user_joined",
      entityType: "user",
      entityId: userId,
      metadata: { role: invite.role },
    });

    return membership;
  }

  static async getPendingInvites(organizationId: string) {
    return prisma.invite.findMany({
      where: {
        organizationId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const existing = await prisma.organization.findUnique({ where: { slug } });
    if (!existing) return slug;
    slug = `${baseSlug}-${counter++}`;
  }
}
