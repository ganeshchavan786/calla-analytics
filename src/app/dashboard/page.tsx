"use client";
// src/app/dashboard/page.tsx — FINAL

import { useEffect, useState, useCallback } from "react";
import {
  Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, TrendingUp, Clock,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { formatDuration } from "@/lib/utils";
import { MyCodeCard } from "@/components/ui/MyCodeCard";
import { SimStatusCard } from "@/components/ui/SimStatusCard";

interface Stats {
  totalCalls: number;
  incomingCalls: number;
  outgoingCalls: number;
  missedCalls: number;
  avgDuration: number;
  missedRate: number;
}

interface Trend {
  date: string;
  incoming: number;
  outgoing: number;
  missed: number;
  total: number;
}

interface HeatmapItem { hour: number; count: number; label: string; }

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

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapItem[]>([]);
  const [period, setPeriod] = useState("7d");
  const [loading, setLoading] = useState(true);

  // Code + SIM state
  const [myCode, setMyCode] = useState<string | null>(null);
  const [codeType, setCodeType] = useState<"OWNER" | "EMPLOYEE" | null>(null);
  const [mySIMs, setMySIMs] = useState<SIM[]>([]);
  const [orgSIMs, setOrgSIMs] = useState<OrgSIM[]>([]);

  const orgId = typeof window !== "undefined"
    ? localStorage.getItem("currentOrgId") || ""
    : "";

  // Fetch current user info + SIMs
  const fetchUserInfo = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/auth/me");
      const data = await res.json();
      if (data.success) {
        setMyCode(data.data.user.uniqueCode);
        setCodeType(data.data.user.codeType);
        setMySIMs(data.data.registeredSIMs || []);
      }
    } catch { /* silent */ }
  }, []);

  // Fetch all org SIMs (Owner/Admin only)
  const fetchOrgSIMs = useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/sims`);
      const data = await res.json();
      if (data.success) setOrgSIMs(data.data);
    } catch { /* silent */ }
  }, [orgId]);

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const base = `/api/v1/organizations/${orgId}/analytics?period=${period}`;
    try {
      const [s, t, h] = await Promise.all([
        fetch(`${base}&type=overview`),
        fetch(`${base}&type=trends`),
        fetch(`${base}&type=heatmap`),
      ]);
      const [sd, td, hd] = await Promise.all([s.json(), t.json(), h.json()]);
      if (sd.success) setStats(sd.data);
      if (td.success) setTrends(td.data);
      if (hd.success) setHeatmap(hd.data);
    } finally {
      setLoading(false);
    }
  }, [orgId, period]);

  useEffect(() => {
    fetchUserInfo();
    fetchOrgSIMs();
  }, [fetchUserInfo, fetchOrgSIMs]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const KPI_CARDS = stats ? [
    { label: "Total Calls", value: stats.totalCalls, icon: Phone, color: "bg-blue-500" },
    { label: "Incoming", value: stats.incomingCalls, icon: PhoneIncoming, color: "bg-green-500" },
    { label: "Outgoing", value: stats.outgoingCalls, icon: PhoneOutgoing, color: "bg-indigo-500" },
    { label: "Missed", value: stats.missedCalls, icon: PhoneMissed, color: "bg-red-500" },
    { label: "Avg Duration", value: formatDuration(stats.avgDuration), icon: Clock, color: "bg-purple-500" },
    { label: "Missed Rate", value: `${stats.missedRate}%`, icon: TrendingUp, color: "bg-orange-500" },
  ] : [];

  // Group orgSIMs by user
  const employeeSIMMap = orgSIMs.reduce<Record<string, { user: OrgSIM["user"]; sims: OrgSIM[] }>>(
    (acc, sim) => {
      const uid = sim.user.id;
      if (!acc[uid]) acc[uid] = { user: sim.user, sims: [] };
      acc[uid].sims.push(sim);
      return acc;
    },
    {}
  );

  const maxHeat = Math.max(...heatmap.map((h) => h.count), 1);

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Call activity overview</p>
        </div>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                period === p.value
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── My Code + SIM Status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {myCode && codeType && (
          <MyCodeCard code={myCode} codeType={codeType} />
        )}
        <SimStatusCard sims={mySIMs} showRegisterButton />
      </div>

      {/* ── Owner: सर्व Employees + SIM Status ── */}
      {codeType === "OWNER" && Object.keys(employeeSIMMap).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Phone size={16} className="text-gray-500" />
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
                              <span className="text-gray-300 ml-1">
                                · {new Date(sim.lastSyncAt).toLocaleDateString("en-IN")}
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

      {/* ── KPI Cards ── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {KPI_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.label}</p>
                  <div className={`w-8 h-8 ${card.color} rounded-lg flex items-center justify-center`}>
                    <Icon size={14} className="text-white" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Line Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Call Trends</h2>
          {trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="incoming" stroke="#22c55e" strokeWidth={2} dot={false} name="Incoming" />
                <Line type="monotone" dataKey="outgoing" stroke="#3b82f6" strokeWidth={2} dot={false} name="Outgoing" />
                <Line type="monotone" dataKey="missed" stroke="#ef4444" strokeWidth={2} dot={false} name="Missed" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
              No call data for this period
            </div>
          )}
        </div>

        {/* Heatmap */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Peak Hours</h2>
          <div className="grid grid-cols-6 gap-1">
            {heatmap.map((h) => {
              const intensity = h.count / maxHeat;
              return (
                <div
                  key={h.hour}
                  title={`${h.label}: ${h.count} calls`}
                  className="aspect-square rounded flex items-center justify-center text-xs font-medium cursor-default"
                  style={{
                    backgroundColor: `rgba(59, 130, 246, ${Math.max(0.08, intensity)})`,
                    color: intensity > 0.5 ? "white" : "#374151",
                  }}
                >
                  {h.hour}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-3">Each cell = 1 hour (0–23)</p>
        </div>
      </div>
    </div>
  );
}
