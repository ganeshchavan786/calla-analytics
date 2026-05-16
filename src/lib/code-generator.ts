// =====================================================
// FILE: src/lib/code-generator.ts  (NEW FILE)
// ACTION: नवीन file बनवा
// =====================================================

import prisma from "./prisma";

type CodeType = "OWNER" | "EMPLOYEE";

// OWN-4829 या EMP-7341 format मध्ये code बनवतो
function makeCode(type: CodeType): string {
  const prefix = type === "OWNER" ? "OWN" : "EMP";
  const number = Math.floor(1000 + Math.random() * 9000); // 4 digit random
  return `${prefix}-${number}`;
}

// Unique code generate करतो — already exist असेल तर retry करतो
export async function generateUniqueCode(type: CodeType): Promise<string> {
  let code = makeCode(type);
  let attempts = 0;

  while (attempts < 10) {
    const existing = await prisma.user.findUnique({
      where: { uniqueCode: code },
    });

    if (!existing) return code; // unique आहे — return करा

    code = makeCode(type);   // duplicate आहे — नवीन try करा
    attempts++;
  }

  // fallback — timestamp add करा
  const prefix = type === "OWNER" ? "OWN" : "EMP";
  return `${prefix}-${Date.now().toString().slice(-5)}`;
}

// Code valid आहे का check करा
export function isOwnerCode(code: string): boolean {
  return /^OWN-\d{4,5}$/.test(code);
}

export function isEmployeeCode(code: string): boolean {
  return /^EMP-\d{4,5}$/.test(code);
}
