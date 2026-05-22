// src/services/analytics.service.ts
// Analytics Service — dashboard stats, trends, heatmaps, team performance

import prisma from "@/lib/prisma";
import type {
  DashboardStats, CallTrend, HourlyHeatmap, TopNumber, TeamMemberStats,
} from "@/types";

export class AnalyticsService {
  // =============================================================
  // DASHBOARD STATS
  // =============================================================

  static async getDashboardStats(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
    userId?: string
  ): Promise<DashboardStats> {
    const baseWhere = {
      organizationId,
      deletedAt: null,
      date: { gte: dateFrom, lte: dateTo },
      ...(userId ? { importedById: userId } : {}),
    };

    const [total, incoming, outgoing, missed, durationResult] =
      await Promise.all([
        prisma.callLog.count({ where: baseWhere }),
        prisma.callLog.count({ where: { ...baseWhere, callType: "INCOMING" } }),
        prisma.callLog.count({ where: { ...baseWhere, callType: "OUTGOING" } }),
        prisma.callLog.count({ where: { ...baseWhere, callType: "MISSED" } }),
        prisma.callLog.aggregate({
          where: { ...baseWhere, callType: { not: "MISSED" } },
          _avg: { duration: true },
        }),
      ]);

    return {
      totalCalls: total,
      incomingCalls: incoming,
      outgoingCalls: outgoing,
      missedCalls: missed,
      avgDuration: Math.round(durationResult._avg.duration ?? 0),
      missedRate: total > 0 ? Math.round((missed / total) * 100) : 0,
    };
  }

  // =============================================================
  // CALL TRENDS (line chart data)
  // =============================================================

  static async getCallTrends(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
    groupBy: "hour" | "day" | "week" | "month" = "day"
  ): Promise<CallTrend[]> {
    const calls = await prisma.callLog.findMany({
      where: {
        organizationId,
        deletedAt: null,
        date: { gte: dateFrom, lte: dateTo },
      },
      select: { callType: true, date: true },
      orderBy: { date: "asc" },
    });

    // Group by date
    const grouped: Record<string, { incoming: number; outgoing: number; missed: number }> = {};

    if (groupBy === "hour") {
      // Pre-populate all 24 hours of the day to make the trend continuous
      for (let h = 0; h < 24; h++) {
        const key = `${h.toString().padStart(2, "0")}:00`;
        grouped[key] = { incoming: 0, outgoing: 0, missed: 0 };
      }
    }

    for (const call of calls) {
      const key = formatDateKey(call.date, groupBy);
      if (!grouped[key]) {
        grouped[key] = { incoming: 0, outgoing: 0, missed: 0 };
      }
      if (call.callType === "INCOMING") grouped[key].incoming++;
      else if (call.callType === "OUTGOING") grouped[key].outgoing++;
      else if (call.callType === "MISSED") grouped[key].missed++;
    }

    return Object.entries(grouped).map(([date, counts]) => ({
      date,
      incoming: counts.incoming,
      outgoing: counts.outgoing,
      missed: counts.missed,
      total: counts.incoming + counts.outgoing + counts.missed,
    }));
  }

  // =============================================================
  // HOURLY HEATMAP
  // =============================================================

  static async getHourlyHeatmap(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date
  ): Promise<HourlyHeatmap[]> {
    const calls = await prisma.callLog.findMany({
      where: {
        organizationId,
        deletedAt: null,
        date: { gte: dateFrom, lte: dateTo },
      },
      select: { date: true },
    });

    const hourCounts = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      count: 0,
      label: `${h.toString().padStart(2, "0")}:00`,
    }));

    for (const call of calls) {
      const hour = new Date(call.date).getHours();
      hourCounts[hour].count++;
    }

    return hourCounts;
  }

  // =============================================================
  // TOP NUMBERS
  // =============================================================

  static async getTopNumbers(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
    limit = 10
  ): Promise<TopNumber[]> {
    const calls = await prisma.callLog.findMany({
      where: {
        organizationId,
        deletedAt: null,
        date: { gte: dateFrom, lte: dateTo },
      },
      select: { mobileNumber: true, contactName: true, duration: true, date: true },
      orderBy: { date: "desc" },
    });

    const grouped: Record<string, {
      contactName: string | null;
      count: number;
      totalDuration: number;
      lastCallDate: Date;
    }> = {};

    for (const call of calls) {
      if (!grouped[call.mobileNumber]) {
        grouped[call.mobileNumber] = {
          contactName: call.contactName,
          count: 0,
          totalDuration: 0,
          lastCallDate: call.date,
        };
      }
      grouped[call.mobileNumber].count++;
      grouped[call.mobileNumber].totalDuration += call.duration;
      if (call.date > grouped[call.mobileNumber].lastCallDate) {
        grouped[call.mobileNumber].lastCallDate = call.date;
      }
    }

    return Object.entries(grouped)
      .map(([mobileNumber, data]) => ({ mobileNumber, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  // =============================================================
  // TEAM PERFORMANCE
  // =============================================================

  static async getTeamStats(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date
  ): Promise<TeamMemberStats[]> {
    const members = await prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    const results: TeamMemberStats[] = [];

    for (const member of members) {
      const userId = member.userId;
      const baseWhere = {
        organizationId,
        importedById: userId,
        deletedAt: null,
        date: { gte: dateFrom, lte: dateTo },
      };

      const [total, incoming, outgoing, missed, durationAgg] = await Promise.all([
        prisma.callLog.count({ where: baseWhere }),
        prisma.callLog.count({ where: { ...baseWhere, callType: "INCOMING" } }),
        prisma.callLog.count({ where: { ...baseWhere, callType: "OUTGOING" } }),
        prisma.callLog.count({ where: { ...baseWhere, callType: "MISSED" } }),
        prisma.callLog.aggregate({
          where: { ...baseWhere, callType: { not: "MISSED" } },
          _avg: { duration: true },
        }),
      ]);

      // Activity score: weighted formula
      const avgDuration = Math.round(durationAgg._avg.duration ?? 0);
      const activityScore = Math.round(
        incoming * 2 + outgoing * 3 - missed * 1 + avgDuration / 60
      );

      results.push({
        userId,
        userName: member.user.name,
        totalCalls: total,
        incomingCalls: incoming,
        outgoingCalls: outgoing,
        missedCalls: missed,
        avgDuration,
        activityScore: Math.max(0, activityScore),
      });
    }

    return results.sort((a, b) => b.activityScore - a.activityScore);
  }

  // =============================================================
  // DUPLICATE NUMBERS
  // =============================================================

  static async getDuplicateNumbers(
    organizationId: string,
    limit = 20
  ) {
    const calls = await prisma.callLog.findMany({
      where: { organizationId, deletedAt: null },
      select: { mobileNumber: true, contactName: true },
    });

    const counts: Record<string, { count: number; contactName: string | null }> = {};
    for (const c of calls) {
      if (!counts[c.mobileNumber]) {
        counts[c.mobileNumber] = { count: 0, contactName: c.contactName };
      }
      counts[c.mobileNumber].count++;
    }

    return Object.entries(counts)
      .filter(([, v]) => v.count > 1)
      .map(([mobileNumber, data]) => ({ mobileNumber, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  // =============================================================
  // MISSED → CALLBACK RESPONSE TIME
  // =============================================================

  static async getResponseTimes(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date
  ) {
    const missedCalls = await prisma.callLog.findMany({
      where: {
        organizationId,
        callType: "MISSED",
        deletedAt: null,
        date: { gte: dateFrom, lte: dateTo },
      },
      select: { mobileNumber: true, date: true },
      orderBy: { date: "asc" },
    });

    const responseTimes: Array<{
      mobileNumber: string;
      missedAt: Date;
      callbackAt: Date | null;
      responseMinutes: number | null;
    }> = [];

    for (const missed of missedCalls) {
      const callback = await prisma.callLog.findFirst({
        where: {
          organizationId,
          mobileNumber: missed.mobileNumber,
          callType: "OUTGOING",
          date: { gt: missed.date },
        },
        orderBy: { date: "asc" },
        select: { date: true },
      });

      responseTimes.push({
        mobileNumber: missed.mobileNumber,
        missedAt: missed.date,
        callbackAt: callback?.date ?? null,
        responseMinutes: callback
          ? Math.round(
              (callback.date.getTime() - missed.date.getTime()) / 60000
            )
          : null,
      });
    }

    return responseTimes;
  }
}

// =============================================================
// HELPERS
// =============================================================

function formatDateKey(date: Date, groupBy: "hour" | "day" | "week" | "month"): string {
  const d = new Date(date);
  if (groupBy === "hour") {
    return `${String(d.getHours()).padStart(2, "0")}:00`;
  }
  if (groupBy === "day") {
    return d.toISOString().split("T")[0];
  }
  if (groupBy === "month") {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  // week: use Monday as week start
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split("T")[0];
}
