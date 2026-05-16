// ================================================
// FILE: src/app/api/docs/route.ts  (NEW FILE)
// PASTE LOCATION: src/app/api/docs/route.ts
// ================================================

import { NextResponse } from "next/server";
import { getApiDocs } from "@/lib/swagger";

export async function GET() {
  const spec = getApiDocs();
  return NextResponse.json(spec);
}
