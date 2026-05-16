"use client";
// src/app/analytics/page.tsx

import { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Users, Phone, Clock } from "lucide-react";
import { formatDuration } from "@/lib/utils";

const COLORS = ["#22c55e", "#3b82f6", "#ef4444", "#f59e0b"];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("30d");
  const [trends, setTrends] = useState<any[]>([]);
  const [heatmap, setHeatmap] = useState<any[]>([]);
  const [topNumbers, setTopNumbers] = useState<any[]>([]);
  const [teamStats, setTeamStats] = useState<any[]>([]);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [responseTimes, setResponseTimes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("trends");

  const orgId = typeof window !== "undefined" ? localStorage.getItem("currentOrgId") || "" : "";

  useEffect(() => {
    if (!orgId) return;
    fetchAnalytics();
  }, [period, orgId]);

  async function fetchAnalytics() {
    setLoading(true);
    const base = `/api/v1/organizations/${orgId}/analytics?period=${period}`;

    try {
      const [trendsRes, heatmapRes, topRes, teamRes, dupRes] = await Promise.all([
        fetch(`${base}&type=trends&groupBy=day`),
        fetch(`${base}&type=heatmap`),
        fetch(`${base}&type=top-numbers&limit=10`),
        fetch(`${base}&type=team`),
        fetch(`${base}&type=duplicates`),
      ]);

      const [t, h, top, team, dup] = await Promise.all([
        trendsRes.json(), heatmapRes.json(), topRes.json(), teamRes.json(), dupRes.json(),
      ]);

      if (t.success) setTrends(t.data);
      if (h.success) setHeatmap(h.data);
      if (top.success) setTopNumbers(top.data);
      if (team.success) setTeamStats(team.data);
      if (dup.success) setDuplicates(dup.data);
    } finally {
      setLoading(false);
    }
  }

  const PERIODS = [
    { value: "7d", label: "7 Days" },
    { value: "30d", label: "30 Days" },
    { value: "90d", label: "90 Days" },
  ];

  const TABS = [
    { value: "trends", label: "Call Trends", icon: TrendingUp },
    { value: "team", label: "Team Performance", icon: Users },
    { value: "numbers", label: "Top Numbers", icon: Phone },
    { value: "heatmap", label: "Peak Hours", icon: Clock },
  ];

  const pieData = trends.length > 0 ? [
    { name: "Incoming", value: trends.reduce((s, t) => s + t.incoming, 0) },
    { name: "Outgoing", value: trends.reduce((s, t) => s + t.outgoing, 0) },
    { name: "Missed", value: trends.reduce((s, t) => s + t.missed, 0) },
  ] : [];

  const maxHeat = Math.max(...heatmap.map((h) => h.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Call activity analysis and insights</p>
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

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-6 h-72 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
              <div className="h-52 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* TRENDS TAB */}
          {activeTab === "trends" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Line Chart */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Daily Call Volume</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="incoming" stroke="#22c55e" strokeWidth={2} dot={false} name="Incoming" />
                    <Line type="monotone" dataKey="outgoing" stroke="#3b82f6" strokeWidth={2} dot={false} name="Outgoing" />
                    <Line type="monotone" dataKey="missed" stroke="#ef4444" strokeWidth={2} dot={false} name="Missed" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Pie Chart */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Call Distribution</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-4">
                  {pieData.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                        <span className="text-gray-600">{item.name}</span>
                      </div>
                      <span className="font-semibold text-gray-900">{item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bar Chart */}
              <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Daily Total Calls (Bar View)</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="incoming" fill="#22c55e" name="Incoming" stackId="a" />
                    <Bar dataKey="outgoing" fill="#3b82f6" name="Outgoing" stackId="a" />
                    <Bar dataKey="missed" fill="#ef4444" name="Missed" stackId="a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* TEAM TAB */}
          {activeTab === "team" && (
            <div className="space-y-4">
              {teamStats.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
                  No team data available
                </div>
              ) : (
                <>
                  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          {["Member", "Total", "Incoming", "Outgoing", "Missed", "Avg Duration", "Activity Score"].map((h) => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {teamStats.map((member, i) => (
                          <tr key={member.userId} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                                  {member.userName[0]}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{member.userName}</p>
                                  {i === 0 && <span className="text-xs text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded-full">Top Performer</span>}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-900">{member.totalCalls}</td>
                            <td className="px-4 py-3 text-green-600">{member.incomingCalls}</td>
                            <td className="px-4 py-3 text-blue-600">{member.outgoingCalls}</td>
                            <td className="px-4 py-3 text-red-600">{member.missedCalls}</td>
                            <td className="px-4 py-3 text-gray-600">{formatDuration(member.avgDuration)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-100 rounded-full h-2">
                                  <div
                                    className="bg-blue-500 h-2 rounded-full"
                                    style={{
                                      width: `${Math.min(100, (member.activityScore / (teamStats[0]?.activityScore || 1)) * 100)}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-xs font-semibold text-gray-700 w-8">{member.activityScore}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-100 p-6">
                    <h2 className="font-semibold text-gray-900 mb-4">Team Comparison</h2>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={teamStats} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="userName" type="category" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="incomingCalls" fill="#22c55e" name="Incoming" />
                        <Bar dataKey="outgoingCalls" fill="#3b82f6" name="Outgoing" />
                        <Bar dataKey="missedCalls" fill="#ef4444" name="Missed" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TOP NUMBERS TAB */}
          {activeTab === "numbers" && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900">Most Frequent Numbers</h2>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {["#", "Number / Contact", "Total Calls", "Total Duration", "Last Call"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {topNumbers.map((num, i) => (
                      <tr key={num.mobileNumber} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            i === 0 ? "bg-yellow-100 text-yellow-700"
                            : i === 1 ? "bg-gray-100 text-gray-600"
                            : i === 2 ? "bg-orange-100 text-orange-700"
                            : "bg-gray-50 text-gray-500"
                          }`}>{i + 1}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{num.contactName || num.mobileNumber}</p>
                          {num.contactName && <p className="text-xs text-gray-400">{num.mobileNumber}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-gray-900 text-base">{num.count}</span>
                          <span className="text-xs text-gray-400 ml-1">calls</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{formatDuration(num.totalDuration)}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {new Date(num.lastCallDate).toLocaleDateString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Duplicates section */}
              {duplicates.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <h3 className="font-semibold text-orange-900 mb-2">⚠️ Duplicate Numbers Detected</h3>
                  <p className="text-sm text-orange-700 mb-3">{duplicates.length} numbers appear multiple times in your call logs.</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {duplicates.slice(0, 8).map((d) => (
                      <div key={d.mobileNumber} className="bg-white rounded-lg px-3 py-2 text-xs">
                        <p className="font-medium text-gray-900">{d.mobileNumber}</p>
                        <p className="text-gray-500">{d.count} times</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HEATMAP TAB */}
          {activeTab === "heatmap" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-2">Peak Calling Hours</h2>
                <p className="text-sm text-gray-500 mb-6">Darker = more calls during that hour</p>
                <div className="grid grid-cols-12 gap-2">
                  {heatmap.map((h) => {
                    const intensity = h.count / maxHeat;
                    return (
                      <div key={h.hour} className="flex flex-col items-center gap-1">
                        <div
                          title={`${h.label}: ${h.count} calls`}
                          className="w-full aspect-square rounded-lg flex items-center justify-center text-xs font-bold cursor-default transition-transform hover:scale-110"
                          style={{
                            backgroundColor: `rgba(59, 130, 246, ${Math.max(0.08, intensity)})`,
                            color: intensity > 0.5 ? "white" : "#374151",
                          }}
                        >
                          {h.count > 0 ? h.count : ""}
                        </div>
                        <span className="text-xs text-gray-400">{h.hour}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <span className="text-xs text-gray-400">Less</span>
                  {[0.1, 0.25, 0.5, 0.75, 1].map((v) => (
                    <div
                      key={v}
                      className="w-6 h-4 rounded"
                      style={{ backgroundColor: `rgba(59, 130, 246, ${v})` }}
                    />
                  ))}
                  <span className="text-xs text-gray-400">More</span>
                </div>
              </div>

              {/* Bar chart of hourly distribution */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Hourly Call Distribution</h2>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={heatmap}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(val) => [`${val} calls`, "Count"]} labelFormatter={(l) => `${l}:00`} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Calls" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
