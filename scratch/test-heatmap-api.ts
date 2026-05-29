import { AnalyticsService } from "../src/services/analytics.service";
import prisma from "../src/lib/prisma";

async function main() {
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.log("No organization found");
    return;
  }
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  console.log("Running getHourlyHeatmap for today...");
  const heatmap = await AnalyticsService.getHourlyHeatmap(org.id, from, to);
  console.log("Heatmap length:", heatmap.length);
  console.log("Heatmap:", heatmap);
}

main().catch(console.error);
