"use client";
// src/app/settings/page.tsx

import { useEffect, useState, useCallback } from "react";
import { Phone } from "lucide-react";
import { MyCodeCard } from "@/components/ui/MyCodeCard";
import { SimStatusCard } from "@/components/ui/SimStatusCard";
import { formatDateTime } from "@/lib/utils";

interface SIM {
  simSlot: string;
  phoneNumber: string;
  deviceName: string | null;
  isActive: boolean;
  lastSyncAt: string | null;
  totalSynced: number;
}

interface OrgSIM extends SIM {
  user: {
    id: string; name: string; email: string;
    uniqueCode: string | null; codeType: string | null;
  };
}

export default function SettingsPage() {
  const [myCode, setMyCode] = useState<string | null>(null);
  const [codeType, setCodeType] = useState<"OWNER" | "EMPLOYEE" | null>(null);
  const [mySIMs, setMySIMs] = useState<SIM[]>([]);
  const [orgSIMs, setOrgSIMs] = useState<OrgSIM[]>([]);
  const [loading, setLoading] = useState(true);

  const orgId = typeof window !== "undefined"
    ? localStorage.getItem("currentOrgId") || ""
    : "";

  const fetchUserInfo = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/auth/me");
      const data = await res.json();
      if (data.success) {
        setMyCode(data.data.user.uniqueCode);
        setCodeType(data.data.user.codeType);
        setMySIMs(data.data.registeredSIMs || []);
      }
    } catch (err) {
      console.error("Failed to load user settings", err);
    }
  }, []);

  const fetchOrgSIMs = useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/sims`);
      const data = await res.json();
      if (data.success) setOrgSIMs(data.data);
    } catch (err) {
      console.error("Failed to load org SIMs", err);
    }
  }, [orgId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchUserInfo(), fetchOrgSIMs()]).finally(() => {
      setLoading(false);
    });
  }, [fetchUserInfo, fetchOrgSIMs]);

  const employeeSIMMap = orgSIMs.reduce<Record<string, { user: OrgSIM["user"]; sims: OrgSIM[] }>>(
    (acc, sim) => {
      const uid = sim.user.id;
      if (!acc[uid]) acc[uid] = { user: sim.user, sims: [] };
      acc[uid].sims.push(sim);
      return acc;
    },
    {}
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mobile Sync Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your mobile sync app codes and SIM registration status</p>
      </div>

      {/* My Code + SIM Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {myCode && codeType && (
          <MyCodeCard code={myCode} codeType={codeType} />
        )}
        <SimStatusCard sims={mySIMs} showRegisterButton />
      </div>

      {/* Owner: Employee SIM Sync Status */}
      {codeType === "OWNER" && Object.keys(employeeSIMMap).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-lg">
            <Phone size={18} className="text-blue-500" />
            Employees — SIM Sync Status
          </h2>
          <div className="space-y-3">
            {Object.values(employeeSIMMap).map(({ user, sims }) => {
              const isActive = sims.some((s) => s.isActive);
              return (
                <div key={user.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600 shrink-0">
                    {user.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <p className="font-semibold text-gray-900">{user.name}</p>
                      {user.uniqueCode && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-mono">
                          {user.uniqueCode}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        isActive ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                      }`}>
                        {isActive ? "✅ Active" : "⏳ Pending"}
                      </span>
                    </div>
                    {sims.length === 0 ? (
                      <p className="text-xs text-gray-400">No SIM registered — Ask to install mobile app</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {sims.map((sim) => (
                          <div key={sim.simSlot} className="text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5">
                            <span className="font-semibold text-gray-700">{sim.simSlot.replace("_", " ")}: </span>
                            <span className="text-gray-600">{sim.phoneNumber}</span>
                            <span className="text-gray-400 ml-1">
                              · {sim.totalSynced.toLocaleString()} synced
                            </span>
                            {sim.lastSyncAt && (
                              <span className="text-gray-400 ml-1">
                                · {formatDateTime(sim.lastSyncAt)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
