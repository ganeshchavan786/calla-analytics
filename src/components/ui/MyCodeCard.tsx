"use client";
// =====================================================
// FILE: src/components/ui/MyCodeCard.tsx  (NEW FILE)
// ACTION: नवीन file बनवा
// PURPOSE: OWN-XXXX / EMP-XXXX code दाखवणारा card
//          Dashboard + Employee page दोन्हीकडे वापरा
// =====================================================

import { useState } from "react";
import { Copy, Check, Smartphone } from "lucide-react";

interface MyCodeCardProps {
  code: string;          // "OWN-4829" या "EMP-7341"
  codeType: "OWNER" | "EMPLOYEE";
}

export function MyCodeCard({ code, codeType }: MyCodeCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isOwner = codeType === "OWNER";

  return (
    <div className={`rounded-xl border p-5 ${isOwner ? "bg-purple-50 border-purple-200" : "bg-blue-50 border-blue-200"}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Smartphone size={16} className={isOwner ? "text-purple-600" : "text-blue-600"} />
        <p className={`text-sm font-semibold ${isOwner ? "text-purple-800" : "text-blue-800"}`}>
          Your Mobile App Code
        </p>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isOwner ? "bg-purple-200 text-purple-700" : "bg-blue-200 text-blue-700"}`}>
          {codeType}
        </span>
      </div>

      {/* Code Box */}
      <div className="flex items-center gap-3">
        <div className={`flex-1 px-4 py-3 rounded-xl font-mono text-xl font-bold tracking-widest text-center ${isOwner ? "bg-purple-100 text-purple-900" : "bg-blue-100 text-blue-900"}`}>
          {code}
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
            copied
              ? "bg-green-500 text-white"
              : isOwner
              ? "bg-purple-600 text-white hover:bg-purple-700"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Info text */}
      <p className={`text-xs mt-3 ${isOwner ? "text-purple-600" : "text-blue-600"}`}>
        <span className="font-semibold">Mobile App मध्ये:</span> Email + Password + हा Code enter करा → Sync सुरू होईल
      </p>
    </div>
  );
}
