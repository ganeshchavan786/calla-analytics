// src/app/api/v1/organizations/[orgId]/reports/route.ts
import { NextRequest } from "next/server";
import { withAuth, apiSuccess, apiError } from "@/lib/middleware";
import { ReportConfigSchema } from "@/lib/validation";
import { AnalyticsService } from "@/services/analytics.service";
import { AuditService } from "@/services/audit.service";
import prisma from "@/lib/prisma";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { formatDuration } from "@/lib/utils-server";

export const GET = withAuth(async (req, ctx) => {
  const sp = req.nextUrl.searchParams;
  const parsed = ReportConfigSchema.safeParse(Object.fromEntries(sp.entries()));

  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid report configuration", 400);
  }

  const { type, dateFrom, dateTo, userId, format } = parsed.data;
  const from = startOfDay(new Date(dateFrom));
  const to = endOfDay(new Date(dateTo));

  // Guests cannot export reports
  if (ctx.role === "GUEST") {
    return apiError("FORBIDDEN", "Guests cannot generate reports", 403);
  }

  const baseWhere = {
    organizationId: ctx.organizationId,
    deletedAt: null,
    date: { gte: from, lte: to },
    ...(userId ? { importedById: userId } : {}),
  };

  let reportData: any[] = [];

  try {
    switch (type) {
      case "DAILY": {
        const calls = await prisma.callLog.findMany({
          where: baseWhere,
          select: {
            mobileNumber: true, contactName: true, callType: true,
            date: true, duration: true, simSlot: true, deviceName: true,
            importedBy: { select: { name: true } },
            tags: { include: { tag: { select: { name: true } } } },
          },
          orderBy: { date: "desc" },
        });
        reportData = calls.map((c) => ({
          Date: c.date.toLocaleDateString("en-IN"),
          Time: c.date.toLocaleTimeString("en-IN"),
          "Mobile Number": c.mobileNumber,
          "Contact Name": c.contactName || "Unknown",
          "Call Type": c.callType,
          "Duration": formatDuration(c.duration),
          "Duration (sec)": c.duration,
          "SIM Slot": c.simSlot,
          "Device": c.deviceName || "",
          "Imported By": c.importedBy.name,
          "Tags": c.tags.map((t) => t.tag.name).join(", "),
        }));
        break;
      }

      case "EMPLOYEE": {
        const members = await prisma.organizationMember.findMany({
          where: { organizationId: ctx.organizationId },
          include: { user: { select: { id: true, name: true, email: true } } },
        });
        reportData = await Promise.all(
          members.map(async (m) => {
            const w = { ...baseWhere, importedById: m.userId };
            const [total, incoming, outgoing, missed, avg] = await Promise.all([
              prisma.callLog.count({ where: w }),
              prisma.callLog.count({ where: { ...w, callType: "INCOMING" } }),
              prisma.callLog.count({ where: { ...w, callType: "OUTGOING" } }),
              prisma.callLog.count({ where: { ...w, callType: "MISSED" } }),
              prisma.callLog.aggregate({ where: { ...w, callType: { not: "MISSED" } }, _avg: { duration: true } }),
            ]);
            return {
              "Member Name": m.user.name,
              Email: m.user.email,
              "Total Calls": total,
              "Incoming": incoming,
              "Outgoing": outgoing,
              "Missed": missed,
              "Avg Duration": formatDuration(Math.round(avg._avg.duration ?? 0)),
              "Missed Rate %": total > 0 ? Math.round((missed / total) * 100) : 0,
            };
          })
        );
        break;
      }

      case "MISSED": {
        const calls = await prisma.callLog.findMany({
          where: { ...baseWhere, callType: "MISSED" },
          select: {
            mobileNumber: true, contactName: true, date: true,
            importedBy: { select: { name: true } },
          },
          orderBy: { date: "desc" },
        });
        reportData = calls.map((c) => ({
          Date: c.date.toLocaleDateString("en-IN"),
          Time: c.date.toLocaleTimeString("en-IN"),
          "Mobile Number": c.mobileNumber,
          "Contact Name": c.contactName || "Unknown",
          "Imported By": c.importedBy.name,
        }));
        break;
      }

      case "NUMBER_WISE": {
        const calls = await prisma.callLog.findMany({
          where: baseWhere,
          select: { mobileNumber: true, contactName: true, callType: true, duration: true, date: true },
        });
        const grouped: Record<string, any> = {};
        for (const c of calls) {
          if (!grouped[c.mobileNumber]) {
            grouped[c.mobileNumber] = {
              "Mobile Number": c.mobileNumber,
              "Contact Name": c.contactName || "Unknown",
              "Total Calls": 0,
              "Incoming": 0,
              "Outgoing": 0,
              "Missed": 0,
              "Total Duration (sec)": 0,
              "Last Call": c.date,
            };
          }
          grouped[c.mobileNumber]["Total Calls"]++;
          if (c.callType === "INCOMING") grouped[c.mobileNumber]["Incoming"]++;
          else if (c.callType === "OUTGOING") grouped[c.mobileNumber]["Outgoing"]++;
          else if (c.callType === "MISSED") grouped[c.mobileNumber]["Missed"]++;
          grouped[c.mobileNumber]["Total Duration (sec)"] += c.duration;
          if (c.date > grouped[c.mobileNumber]["Last Call"]) {
            grouped[c.mobileNumber]["Last Call"] = c.date;
          }
        }
        reportData = Object.values(grouped)
          .sort((a, b) => b["Total Calls"] - a["Total Calls"])
          .map((r) => ({ ...r, "Last Call": new Date(r["Last Call"]).toLocaleDateString("en-IN") }));
        break;
      }

      case "PRODUCTIVITY": {
        const teamStats = await AnalyticsService.getTeamStats(ctx.organizationId, from, to);
        reportData = teamStats.map((s) => ({
          "Member": s.userName,
          "Total Calls": s.totalCalls,
          "Incoming": s.incomingCalls,
          "Outgoing": s.outgoingCalls,
          "Missed": s.missedCalls,
          "Avg Duration": formatDuration(s.avgDuration),
          "Activity Score": s.activityScore,
        }));
        break;
      }

      case "TREND": {
        const trends = await AnalyticsService.getCallTrends(ctx.organizationId, from, to, "day");
        reportData = trends.map((t) => ({
          Date: t.date,
          "Total Calls": t.total,
          "Incoming": t.incoming,
          "Outgoing": t.outgoing,
          "Missed": t.missed,
        }));
        break;
      }

      case "PEAK_HOUR": {
        const heatmap = await AnalyticsService.getHourlyHeatmap(ctx.organizationId, from, to);
        reportData = heatmap.map((h) => ({
          Hour: h.label,
          "Total Calls": h.count,
          "Peak Level": h.count > 50 ? "High" : h.count > 20 ? "Medium" : "Low",
        }));
        break;
      }

      default:
        return apiError("BAD_REQUEST", `Report type ${type} not implemented`, 400);
    }

    await AuditService.log({
      organizationId: ctx.organizationId,
      actorId: ctx.user.id,
      action: "report_exported",
      entityType: "report",
      entityId: ctx.organizationId,
      metadata: { type, dateFrom, dateTo, format, rowCount: reportData.length },
    });

    return apiSuccess(reportData);
  } catch (error: any) {
    console.error("[GET /reports]", error);
    return apiError("INTERNAL_ERROR", error.message, 500);
  }
});
