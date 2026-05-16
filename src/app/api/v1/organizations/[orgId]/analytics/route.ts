// src/app/api/v1/organizations/[orgId]/analytics/route.ts
import { NextRequest } from "next/server";
import { withAuth, apiSuccess, apiError } from "@/lib/middleware";
import { AnalyticsService } from "@/services/analytics.service";
import { AnalyticsQuerySchema } from "@/lib/validation";
import { subDays, startOfDay, endOfDay, startOfToday, subDays as sub } from "date-fns";

// GET /api/v1/organizations/:orgId/analytics
export const GET = withAuth(async (req, ctx) => {
  const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = AnalyticsQuerySchema.safeParse(searchParams);

  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid query params", 400);
  }

  const { period, dateFrom, dateTo, userId, groupBy } = parsed.data;

  // Resolve date range
  const now = new Date();
  let from: Date;
  let to: Date;

  if (period === "custom" && dateFrom && dateTo) {
    from = startOfDay(new Date(dateFrom));
    to = endOfDay(new Date(dateTo));
  } else {
    to = endOfDay(now);
    switch (period) {
      case "today":
        from = startOfToday();
        break;
      case "yesterday":
        from = startOfDay(subDays(now, 1));
        to = endOfDay(subDays(now, 1));
        break;
      case "7d":
        from = startOfDay(subDays(now, 7));
        break;
      case "30d":
        from = startOfDay(subDays(now, 30));
        break;
      case "90d":
        from = startOfDay(subDays(now, 90));
        break;
      default:
        from = startOfDay(subDays(now, 7));
    }
  }

  // Guests can only see their own analytics
  const filterUserId = ctx.role === "GUEST" ? ctx.user.id : userId;

  const type = req.nextUrl.searchParams.get("type") || "overview";

  try {
    switch (type) {
      case "overview":
        const stats = await AnalyticsService.getDashboardStats(
          ctx.organizationId, from, to, filterUserId
        );
        return apiSuccess(stats);

      case "trends":
        const trends = await AnalyticsService.getCallTrends(
          ctx.organizationId, from, to, groupBy
        );
        return apiSuccess(trends);

      case "heatmap":
        const heatmap = await AnalyticsService.getHourlyHeatmap(
          ctx.organizationId, from, to
        );
        return apiSuccess(heatmap);

      case "top-numbers":
        const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "10");
        const topNumbers = await AnalyticsService.getTopNumbers(
          ctx.organizationId, from, to, limit
        );
        return apiSuccess(topNumbers);

      case "team":
        if (ctx.role === "GUEST") {
          return apiError("FORBIDDEN", "Guests cannot view team analytics", 403);
        }
        const teamStats = await AnalyticsService.getTeamStats(
          ctx.organizationId, from, to
        );
        return apiSuccess(teamStats);

      case "response-times":
        const responseTimes = await AnalyticsService.getResponseTimes(
          ctx.organizationId, from, to
        );
        return apiSuccess(responseTimes);

      case "duplicates":
        const duplicates = await AnalyticsService.getDuplicateNumbers(
          ctx.organizationId
        );
        return apiSuccess(duplicates);

      default:
        return apiError("BAD_REQUEST", `Unknown analytics type: ${type}`, 400);
    }
  } catch (error: any) {
    console.error("[GET /analytics]", error);
    return apiError("INTERNAL_ERROR", error.message, 500);
  }
});
