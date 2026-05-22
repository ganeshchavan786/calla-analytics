"use client";
// src/app/analytics/page.tsx

import { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, Users, Phone, Clock, FileText, Smartphone, Calendar, User, PhoneCall, Award, AlertTriangle, AlertCircle, BarChart2, Star, PieChart as LucidePieChart
} from "lucide-react";
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

  // Helper to render soft pastel avatar initials
  const renderAvatar = (name: string | null, number: string) => {
    const displayName = name || "New Lead";
    const initials = displayName
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
    
    const colors = [
      "bg-red-50 text-red-600 border-red-100",
      "bg-orange-50 text-orange-600 border-orange-100",
      "bg-amber-50 text-amber-600 border-amber-100",
      "bg-emerald-50 text-emerald-600 border-emerald-100",
      "bg-teal-50 text-teal-600 border-teal-100",
      "bg-sky-50 text-sky-600 border-sky-100",
      "bg-indigo-50 text-indigo-600 border-indigo-100",
      "bg-violet-50 text-violet-600 border-violet-100",
      "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100",
      "bg-pink-50 text-pink-600 border-pink-100"
    ];
    
    const index = Math.abs(
      (name || number).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    ) % colors.length;
    
    const colorClass = colors[index];

    return (
      <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ${colorClass}`}>
        {initials || "?"}
      </div>
    );
  };

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
    } catch (err) {
      console.error("Failed to fetch analytics", err);
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
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Call activity analysis and insights</p>
        </div>
        
        {/* Period Selector Buttons */}
        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/50 shadow-inner">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                period === p.value
                  ? "bg-white text-slate-800 shadow-sm border border-slate-200/10"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs bar */}
      <div className="flex gap-1.5 bg-slate-100/85 backdrop-blur-md rounded-2xl p-1 border border-slate-200/50 w-fit shadow-inner">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? "bg-white text-slate-800 shadow-sm border border-slate-200/20"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon size={14} className={isActive ? "text-amber-500" : "text-slate-400"} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gradient-to-br from-white/95 to-slate-50/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-6 h-72 animate-pulse shadow-sm">
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-4" />
              <div className="h-52 bg-slate-100/50 rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* TRENDS TAB */}
          {activeTab === "trends" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
              {/* Line Chart */}
              <div className="lg:col-span-2 bg-gradient-to-br from-white/95 to-slate-50/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-100/40 p-6 transition-all duration-200 hover:shadow-xl">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                  <TrendingUp size={16} className="text-amber-500" />
                  <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Daily Call Volume</h2>
                </div>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trends} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)" }}
                        labelStyle={{ fontWeight: "bold", color: "#1e293b", fontSize: "11px" }}
                        itemStyle={{ fontSize: "11px", fontWeight: "600" }}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: "11px", fontWeight: "600", color: "#64748b" }} />
                      <Line type="monotone" dataKey="incoming" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} name="Incoming" />
                      <Line type="monotone" dataKey="outgoing" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} name="Outgoing" />
                      <Line type="monotone" dataKey="missed" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} name="Missed" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pie Chart */}
              <div className="bg-gradient-to-br from-white/95 to-slate-50/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-100/40 p-6 transition-all duration-200 hover:shadow-xl">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                  <LucidePieChart size={16} className="text-indigo-500" />
                  <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Call Distribution</h2>
                </div>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={pieData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={55}
                        outerRadius={75} 
                        dataKey="value" 
                        labelLine={false}
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i]} stroke="#fff" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0" }}
                        itemStyle={{ fontSize: "11px", fontWeight: "600" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-4 border-t border-slate-100 pt-3">
                  {pieData.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                        <span className="text-slate-600">{item.name}</span>
                      </div>
                      <span className="font-bold text-slate-800 font-mono">{item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bar Chart */}
              <div className="lg:col-span-3 bg-gradient-to-br from-white/95 to-slate-50/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-100/40 p-6 transition-all duration-200 hover:shadow-xl">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                  <BarChart2 size={16} className="text-emerald-500" />
                  <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Daily Total Calls (Bar View)</h2>
                </div>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trends} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0" }}
                        labelStyle={{ fontWeight: "bold", color: "#1e293b", fontSize: "11px" }}
                        itemStyle={{ fontSize: "11px", fontWeight: "600" }}
                      />
                      <Bar dataKey="incoming" fill="#22c55e" name="Incoming" stackId="a" maxBarSize={20} />
                      <Bar dataKey="outgoing" fill="#3b82f6" name="Outgoing" stackId="a" maxBarSize={20} />
                      <Bar dataKey="missed" fill="#ef4444" name="Missed" stackId="a" radius={[3, 3, 0, 0]} maxBarSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TEAM TAB */}
          {activeTab === "team" && (
            <div className="space-y-6 animate-fadeIn">
              {teamStats.length === 0 ? (
                <div className="bg-gradient-to-br from-white/95 to-slate-50/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 font-semibold shadow-sm">
                  No team performance records available.
                </div>
              ) : (
                <>
                  {/* Team Performance Table */}
                  <div className="bg-gradient-to-br from-white/95 to-slate-50/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-100/40 p-1 overflow-hidden">
                    <div className="overflow-x-auto rounded-xl">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gradient-to-r from-slate-100/80 to-slate-50/80 text-slate-600 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-200/80">
                            <th className="py-4 px-5">
                              <span className="flex items-center gap-1.5">
                                <User size={13} className="text-slate-400" />
                                Member
                              </span>
                            </th>
                            <th className="py-4 px-4 text-center">
                              <span className="flex items-center justify-center gap-1.5">
                                <Award size={13} className="text-slate-400" />
                                Total
                              </span>
                            </th>
                            <th className="py-4 px-4 text-center">
                              <span className="flex items-center justify-center gap-1.5 text-emerald-600">
                                Incoming
                              </span>
                            </th>
                            <th className="py-4 px-4 text-center">
                              <span className="flex items-center justify-center gap-1.5 text-blue-600">
                                Outgoing
                              </span>
                            </th>
                            <th className="py-4 px-4 text-center">
                              <span className="flex items-center justify-center gap-1.5 text-rose-600">
                                Missed
                              </span>
                            </th>
                            <th className="py-4 px-4">
                              <span className="flex items-center gap-1.5">
                                <Clock size={13} className="text-slate-400" />
                                Avg Duration
                              </span>
                            </th>
                            <th className="py-4 px-5">
                              <span className="flex items-center gap-1.5">
                                <TrendingUp size={13} className="text-slate-400" />
                                Activity Score
                              </span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 bg-white/50">
                          {teamStats.map((member, i) => (
                            <tr key={member.userId} className="hover:bg-slate-100/40 hover:-translate-y-[0.5px] transition-all duration-200 group font-medium">
                              {/* Member info with initials avatar */}
                              <td className="py-4 px-5">
                                <div className="flex items-center gap-3">
                                  {renderAvatar(member.userName, member.userId)}
                                  <div>
                                    <p className="font-semibold text-slate-800 leading-tight">{member.userName}</p>
                                    {i === 0 && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-100 shadow-sm mt-1 w-fit">
                                        <Star size={9} className="fill-amber-500 text-amber-500 animate-pulse" />
                                        Top Performer
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Total Calls */}
                              <td className="py-4 px-4 text-center">
                                <span className="font-mono font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 text-xs shadow-sm">
                                  {member.totalCalls}
                                </span>
                              </td>

                              {/* Incoming Calls */}
                              <td className="py-4 px-4 text-center">
                                <span className="font-mono font-bold text-emerald-600 bg-emerald-50/50 px-2.5 py-1 rounded-lg border border-emerald-100/80 text-xs">
                                  {member.incomingCalls}
                                </span>
                              </td>

                              {/* Outgoing Calls */}
                              <td className="py-4 px-4 text-center">
                                <span className="font-mono font-bold text-blue-600 bg-blue-50/50 px-2.5 py-1 rounded-lg border border-blue-100/80 text-xs">
                                  {member.outgoingCalls}
                                </span>
                              </td>

                              {/* Missed Calls */}
                              <td className="py-4 px-4 text-center">
                                <span className="font-mono font-bold text-rose-600 bg-rose-50/50 px-2.5 py-1 rounded-lg border border-rose-100/80 text-xs">
                                  {member.missedCalls}
                                </span>
                              </td>

                              {/* Avg Duration */}
                              <td className="py-4 px-4 text-slate-600 font-mono text-xs">
                                {formatDuration(member.avgDuration)}
                              </td>

                              {/* Activity Score glowing progress bar */}
                              <td className="py-4 px-5">
                                <div className="flex items-center gap-3.5 min-w-[140px]">
                                  <div className="flex-1 bg-slate-100 rounded-full h-2 p-[1px] border border-slate-200/30 overflow-hidden">
                                    <div
                                      className="bg-gradient-to-r from-sky-400 to-blue-500 h-full rounded-full shadow-[0_0_8px_rgba(14,165,233,0.3)] transition-all duration-500"
                                      style={{
                                        width: `${Math.min(100, (member.activityScore / (teamStats[0]?.activityScore || 1)) * 100)}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="text-xs font-mono font-bold text-slate-800 w-8">{member.activityScore}</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Team Comparison chart card */}
                  <div className="bg-gradient-to-br from-white/95 to-slate-50/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-100/40 p-6 transition-all duration-200 hover:shadow-xl">
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                      <Users size={16} className="text-blue-500" />
                      <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Team Comparison</h2>
                    </div>
                    <div className="h-[260px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={teamStats} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                          <YAxis dataKey="userName" type="category" width={80} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0" }}
                            itemStyle={{ fontSize: "11px", fontWeight: "600" }}
                          />
                          <Legend wrapperStyle={{ fontSize: "11px", fontWeight: "600" }} />
                          <Bar dataKey="incomingCalls" fill="#22c55e" name="Incoming" radius={[0, 3, 3, 0]} maxBarSize={15} />
                          <Bar dataKey="outgoingCalls" fill="#3b82f6" name="Outgoing" radius={[0, 3, 3, 0]} maxBarSize={15} />
                          <Bar dataKey="missedCalls" fill="#ef4444" name="Missed" radius={[0, 3, 3, 0]} maxBarSize={15} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TOP NUMBERS TAB */}
          {activeTab === "numbers" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Frequent Numbers Card */}
              <div className="bg-gradient-to-br from-white/95 to-slate-50/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-100/40 p-1 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200/50 bg-slate-50/30 flex items-center gap-2">
                  <Award size={16} className="text-amber-500" />
                  <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Most Frequent Numbers</h2>
                </div>
                <div className="overflow-x-auto rounded-b-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-100/80 to-slate-50/80 text-slate-600 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-200/80">
                        <th className="py-4 px-5 text-center min-w-[50px]">#</th>
                        <th className="py-4 px-4 min-w-[200px]">
                          <span className="flex items-center gap-1.5">
                            <Smartphone size={13} className="text-slate-400" />
                            Number / Contact
                          </span>
                        </th>
                        <th className="py-4 px-4 text-center">
                          <span className="flex items-center justify-center gap-1.5">
                            <PhoneCall size={13} className="text-slate-400" />
                            Total Calls
                          </span>
                        </th>
                        <th className="py-4 px-4">
                          <span className="flex items-center gap-1.5">
                            <Clock size={13} className="text-slate-400" />
                            Total Duration
                          </span>
                        </th>
                        <th className="py-4 px-5">
                          <span className="flex items-center gap-1.5">
                            <Calendar size={13} className="text-slate-400" />
                            Last Call
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 bg-white/50">
                      {topNumbers.map((num, i) => (
                        <tr key={num.mobileNumber} className="hover:bg-slate-100/40 hover:-translate-y-[0.5px] transition-all duration-200 group font-medium">
                          {/* Rank # badge */}
                          <td className="py-4 px-5 text-center">
                            <div className="flex justify-center">
                              {i === 0 ? (
                                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm shadow-amber-100/60">
                                  <Star size={10} className="fill-amber-500 text-amber-500 mr-0.5 shrink-0" />1
                                </span>
                              ) : i === 1 ? (
                                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-sm">2</span>
                              ) : i === 2 ? (
                                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200 shadow-sm">3</span>
                              ) : (
                                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-slate-100 text-slate-500 border border-slate-100">{i + 1}</span>
                              )}
                            </div>
                          </td>

                          {/* Contact Info */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              {renderAvatar(num.contactName, num.mobileNumber)}
                              <div>
                                <p className="font-semibold text-slate-800 leading-tight">
                                  {num.contactName || (
                                    <span className="text-amber-600 flex items-center gap-1 text-xs">
                                      <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></span>
                                      New Lead
                                    </span>
                                  )}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{num.mobileNumber}</p>
                              </div>
                            </div>
                          </td>

                          {/* Count Badge */}
                          <td className="py-4 px-4 text-center">
                            <span className="font-mono font-bold text-slate-800 text-xs bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 shadow-sm">
                              {num.count} <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider ml-0.5">calls</span>
                            </span>
                          </td>

                          {/* Total Duration */}
                          <td className="py-4 px-4 text-slate-700 font-mono text-xs">
                            {formatDuration(num.totalDuration)}
                          </td>

                          {/* Last Call Date */}
                          <td className="py-4 px-5 text-slate-500 font-mono text-xs">
                            {new Date(num.lastCallDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Duplicates Alert Container */}
              {duplicates.length > 0 && (
                <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/80 backdrop-blur-sm border border-amber-200/80 rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 border-b border-amber-200/40 pb-2">
                    <AlertTriangle className="text-amber-500 shrink-0 animate-bounce" size={16} />
                    <h3 className="font-bold text-amber-800 text-sm uppercase tracking-wider">Duplicate Numbers Detected</h3>
                  </div>
                  <p className="text-xs text-amber-700 font-semibold">{duplicates.length} numbers appear multiple times in your call logs.</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {duplicates.slice(0, 8).map((d) => (
                      <div key={d.mobileNumber} className="bg-white/80 border border-amber-100 rounded-xl px-3 py-2 text-xs shadow-sm hover:scale-[1.02] transition-transform duration-200">
                        <p className="font-bold text-slate-800 font-mono">{d.mobileNumber}</p>
                        <p className="text-[10px] text-amber-600 font-semibold mt-0.5">{d.count} occurrences</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HEATMAP TAB */}
          {activeTab === "heatmap" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Heatmap Card */}
              <div className="bg-gradient-to-br from-white/95 to-slate-50/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-100/40 p-6 transition-all duration-200 hover:shadow-xl">
                <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-3">
                  <Clock size={16} className="text-indigo-500" />
                  <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Peak Calling Hours</h2>
                </div>
                <p className="text-xs text-slate-500 font-medium mb-6">Darker colors indicate higher call volumes during that hour</p>
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-3">
                  {heatmap.map((h) => {
                    const intensity = h.count / maxHeat;
                    return (
                      <div key={h.hour} className="flex flex-col items-center gap-1.5 group">
                        <div
                          title={`${h.label}: ${h.count} calls`}
                          className="w-full aspect-square rounded-xl flex items-center justify-center text-xs font-bold cursor-default transition-all duration-300 hover:scale-110 shadow-sm border border-slate-200/20"
                          style={{
                            backgroundColor: `rgba(59, 130, 246, ${Math.max(0.08, intensity)})`,
                            color: intensity > 0.5 ? "white" : "#374151",
                          }}
                        >
                          {h.count > 0 ? h.count : ""}
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 font-mono group-hover:text-slate-700 transition-colors">{h.hour}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Volume: Less</span>
                  {[0.08, 0.25, 0.5, 0.75, 1].map((v) => (
                    <div
                      key={v}
                      className="w-7 h-4 rounded-md border border-slate-200/20 shadow-sm"
                      style={{ backgroundColor: `rgba(59, 130, 246, ${v})` }}
                    />
                  ))}
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">More</span>
                </div>
              </div>

              {/* Hourly distribution card */}
              <div className="bg-gradient-to-br from-white/95 to-slate-50/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-100/40 p-6 transition-all duration-200 hover:shadow-xl">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                  <BarChart2 size={16} className="text-blue-500" />
                  <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Hourly Call Distribution</h2>
                </div>
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={heatmap} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0" }}
                        formatter={(val) => [`${val} calls`, "Count"]} 
                        labelFormatter={(l) => `Hour ${l}:00`} 
                      />
                      <Bar dataKey="count" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Calls" maxBarSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
