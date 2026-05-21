// =====================================================
// FILE: src/lib/code-generator.ts  (NEW FILE)
// ACTION: Create new file
// =====================================================

import prisma from "./prisma";

type CodeType = "OWNER" | "EMPLOYEE";

// Generates code in OWN-4829 or EMP-7341 format
function makeCode(type: CodeType): string {
  const prefix = type === "OWNER" ? "OWN" : "EMP";
  const number = Math.floor(1000 + Math.random() * 9000); // 4 digit random
  return `${prefix}-${number}`;
}

// Generates unique code — retries if it already exists
export async function generateUniqueCode(type: CodeType): Promise<string> {
  let code = makeCode(type);
  let attempts = 0;

  while (attempts < 10) {
    const existing = await prisma.user.findUnique({
      where: { uniqueCode: code },
    });

    if (!existing) return code; // unique — return it

    code = makeCode(type);   // duplicate — try new one
    attempts++;
  }

  // fallback — add timestamp
  const prefix = type === "OWNER" ? "OWN" : "EMP";
  return `${prefix}-${Date.now().toString().slice(-5)}`;
}

// Check if code is valid
export function isOwnerCode(code: string): boolean {
  return /^OWN-\d{4,5}$/.test(code);
}

export function isEmployeeCode(code: string): boolean {
  return /^EMP-\d{4,5}$/.test(code);
}
