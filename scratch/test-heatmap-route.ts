import { GET } from "../src/app/api/v1/organizations/[orgId]/analytics/route";
import prisma from "../src/lib/prisma";
import { signToken } from "../src/lib/auth";
import { NextRequest } from "next/server";

async function main() {
  const user = await prisma.user.findFirst();
  const org = await prisma.organization.findFirst();
  if (!user || !org) {
    console.log("No user or organization found");
    return;
  }

  // Find membership
  const membership = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: org.id, userId: user.id } },
  });

  const token = await signToken({
    userId: user.id,
    email: user.email,
    organizationId: org.id,
    role: membership?.role || "OWNER",
  });

  const url = `http://localhost:3000/api/v1/organizations/${org.id}/analytics?period=today&type=heatmap`;
  const req = new NextRequest(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  console.log("Calling GET /api/v1/organizations/[orgId]/analytics...");
  const res = await GET(req, { params: { orgId: org.id } });
  console.log("Response status:", res.status);
  const data = await res.json();
  console.log("Response data length:", data.success ? data.data.length : data);
  console.log("Response data:", data);
}

main().catch(console.error);
