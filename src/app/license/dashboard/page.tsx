"use client";
// src/app/license/dashboard/page.tsx
// URL: http://localhost:3000/license/dashboard

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Shield, Users, Building2, Phone, LogOut,
  Settings, Mail, RefreshCw, CheckCircle,
  XCircle, Clock, Search, Send, Play, Server,
} from "lucide-react";

// =============================================================
// TYPES
// =============================================================
interface Stats {
  total: number; todayCount: number; weekCount: number;
  verifiedCount: number; unverifiedCount: number;
}
interface User {
  id: string; name: string; email: string;
  isVerified: boolean; createdAt: string;
  uniqueCode: string | null; codeType: string | null;
  memberships: {
    role: string;
    organization: {
      id: string;
      name: string;
      status: string;
      planType: string;
      subscriptionEndDate: string | null;
    };
  }[];
  _count: { importedLogs: number };
}
interface SmtpSettings {
  smtpHost: string; smtpPort: number; smtpUser: string; smtpPass: string;
  smtpSecure: boolean; fromEmail: string; fromName: string;
  appName: string; supportEmail: string; appUrl: string;
  cronReportEmail: string; cronReportTime: string; cronReportEnabled: boolean;
}

type Tab = "dashboard" | "smtp" | "users" | "cron";

// =============================================================
// MAIN COMPONENT
// =============================================================
export default function LicenseDashboard() {
  const router = useRouter();
  const [admin, setAdmin] = useState<{ name: string; email: string } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(true);

  // Dashboard stats
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [totalCallLogs, setTotalCallLogs] = useState(0);
  const [totalOrgs, setTotalOrgs] = useState(0);

  // SMTP
  const [smtp, setSmtp] = useState<Partial<SmtpSettings>>({});
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpMsg, setSmtpMsg] = useState("");
  const [smtpTesting, setSmtpTesting] = useState(false);

  // Users tab
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState("all");

  // Cron jobs
  const [cronJobs, setCronJobs] = useState<any[]>([]);
  const [cronRunning, setCronRunning] = useState<string | null>(null);
  const [cronMsg, setCronMsg] = useState("");

  // License management actions
  const [submittingOrgId, setSubmittingOrgId] = useState<string | null>(null);
  const [extendModalOrg, setExtendModalOrg] = useState<{ id: string; name: string; endDate: string | null } | null>(null);
  const [customDays, setCustomDays] = useState<number>(30);

  // =============================================================
  // FETCH FUNCTIONS
  // =============================================================

  const fetchAdmin = useCallback(async () => {
    const res = await fetch("/api/license/auth/me");
    const data = await res.json();
    if (!data.success) { router.push("/license/login"); return; }
    setAdmin(data.data);
  }, [router]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, smtpRes, cronRes] = await Promise.all([
        fetch("/api/license/users?limit=5"),
        fetch("/api/license/smtp"),
        fetch("/api/license/cron"),
      ]);
      const [usersData, smtpData, cronData] = await Promise.all([
        usersRes.json(), smtpRes.json(), cronRes.json(),
      ]);

      if (usersData.success) {
        setStats(usersData.data.stats);
        setUsers(usersData.data.users);
      }
      if (smtpData.success) setSmtp(smtpData.data);
      if (cronData.success) setCronJobs(cronData.data.jobs);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllUsers = useCallback(async () => {
    const params = new URLSearchParams({
      limit: "100",
      filter: userFilter,
      ...(userSearch ? { search: userSearch } : {}),
    });
    const res = await fetch(`/api/license/users?${params}`);
    const data = await res.json();
    if (data.success) {
      setUsers(data.data.users);
      setStats(data.data.stats);
    }
  }, [userFilter, userSearch]);

  useEffect(() => { fetchAdmin(); fetchDashboardData(); }, []);
  useEffect(() => { if (activeTab === "users") fetchAllUsers(); }, [activeTab, userFilter, userSearch]);

  // =============================================================
  // HANDLERS
  // =============================================================

  async function handleLogout() {
    await fetch("/api/license/auth/logout", { method: "POST" });
    router.push("/license/login");
  }

  async function handleSmtpSave(e: React.FormEvent) {
    e.preventDefault();
    setSmtpSaving(true); setSmtpMsg("");
    try {
      const res = await fetch("/api/license/smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(smtp),
      });
      const data = await res.json();
      setSmtpMsg(data.success ? "✅ Settings saved successfully!" : `❌ ${data.message}`);
    } finally {
      setSmtpSaving(false);
    }
  }

  async function handleSmtpTest() {
    setSmtpTesting(true); setSmtpMsg("");
    try {
      const res = await fetch("/api/license/smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test" }),
      });
      const data = await res.json();
      setSmtpMsg(data.data?.success
        ? "✅ SMTP connection successful!"
        : `❌ ${data.data?.message || "Connection failed"}`
      );
    } finally {
      setSmtpTesting(false);
    }
  }

  async function handleCronTrigger(action: string, name: string) {
    setCronRunning(action); setCronMsg("");
    try {
      const res = await fetch("/api/license/cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      setCronMsg(data.success
        ? `✅ ${name} completed: ${data.data?.message || "Done"}`
        : `❌ Failed: ${data.message}`
      );
    } finally {
      setCronRunning(null);
    }
  }

  async function handleOrgAction(orgId: string, action: string, payload?: any) {
    setSubmittingOrgId(orgId);
    try {
      const res = await fetch(`/api/license/organizations/${orgId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (data.success) {
        fetchAllUsers();
        if (extendModalOrg) setExtendModalOrg(null);
      } else {
        alert(`त्रुटी: ${data.message || "बदलाव करता आला नाही"}`);
      }
    } catch (err) {
      console.error(err);
      alert("सर्व्हरशी संपर्क होऊ शकला नाही.");
    } finally {
      setSubmittingOrgId(null);
    }
  }

  // =============================================================
  // NAV ITEMS
  // =============================================================
  const NAV_ITEMS: { tab: Tab; label: string; icon: any }[] = [
    { tab: "dashboard", label: "Dashboard", icon: Shield },
    { tab: "smtp", label: "SMTP Settings", icon: Mail },
    { tab: "users", label: "Users", icon: Users },
    { tab: "cron", label: "Cron Jobs", icon: Clock },
  ];

  // =============================================================
  // RENDER
  // =============================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-950 text-slate-100 flex font-sans">

      {/* ── Sidebar ── */}
      <aside className="w-64 bg-zinc-900/60 backdrop-blur-xl border-r border-zinc-800/80 flex flex-col shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-zinc-800/80">
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.4)]">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-300 text-sm tracking-wide">License Manager</p>
            <p className="text-indigo-400 font-medium text-[10px] uppercase tracking-wider">Super Admin</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {NAV_ITEMS.map(({ tab, label, icon: Icon }) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-indigo-500/10 border-l-2 border-indigo-500 text-white font-semibold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                    : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-100 hover:translate-x-1"
                }`}
              >
                <Icon size={16} className={isActive ? "text-indigo-400 animate-pulse" : "text-zinc-500"} />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Admin info + Logout */}
        <div className="p-4 border-t border-zinc-800/80">
          {admin && (
            <div className="mb-4 bg-zinc-950/40 border border-zinc-800/60 rounded-2xl p-3 shadow-inner">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs">
                  {admin.name[0].toUpperCase()}
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-white truncate">{admin.name}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{admin.email}</p>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-xl transition-all duration-200"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto p-10">

        {/* ========== DASHBOARD TAB ========== */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400 tracking-tight">Dashboard</h1>
              <p className="text-zinc-400 text-sm mt-1">System-wide license and subscriber insights</p>
            </div>

            {/* KPI Cards */}
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[1,2,3,4].map(i => (
                  <div key={i} className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-6 animate-pulse h-32" />
                ))}
              </div>
            ) : stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Total Users", value: stats.total, icon: Users, color: "from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/20 hover:shadow-blue-500/5", glow: "rgba(59,130,246,0.15)" },
                  { label: "Verified", value: stats.verifiedCount, icon: CheckCircle, color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/20 hover:shadow-emerald-500/5", glow: "rgba(16,185,129,0.15)" },
                  { label: "Unverified", value: stats.unverifiedCount, icon: XCircle, color: "from-rose-500/20 to-red-500/10 text-rose-400 border-rose-500/20 hover:shadow-rose-500/5", glow: "rgba(244,63,94,0.15)" },
                  { label: "New Today", value: stats.todayCount, icon: RefreshCw, color: "from-purple-500/20 to-fuchsia-500/10 text-purple-400 border-purple-500/20 hover:shadow-purple-500/5", glow: "rgba(168,85,247,0.15)" },
                ].map(card => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.label}
                      className={`bg-zinc-900/40 border backdrop-blur-md rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-zinc-700/60 shadow-lg`}
                      style={{
                        boxShadow: `0 4px 20px -2px rgba(0,0,0,0.3)`
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = `0 12px 25px -5px ${card.glow}`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = `0 4px 20px -2px rgba(0,0,0,0.3)`;
                      }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">{card.label}</p>
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-tr border ${card.color} shadow-inner`}>
                          <Icon size={16} />
                        </div>
                      </div>
                      <p className="text-4xl font-extrabold text-white tracking-tight">{card.value}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Recent Users */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl overflow-hidden backdrop-blur-md shadow-xl">
              <div className="px-6 py-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/20">
                <h2 className="font-bold text-white text-lg tracking-tight">Recent Registrations</h2>
                <button
                  onClick={() => setActiveTab("users")}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/20 hover:bg-indigo-500/20 transition-all"
                >
                  View all registrations →
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-950/40 border-b border-zinc-800/60">
                    <tr>
                      {["User Details", "Organization", "License Code", "Status", "Joined On"].map(h => (
                        <th key={h} className="text-left px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 font-medium">No recent registrations found</td>
                      </tr>
                    ) : users.map(user => (
                      <tr key={user.id} className="hover:bg-zinc-800/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/10 border border-indigo-500/25 flex items-center justify-center text-sm font-bold text-indigo-300">
                              {user.name[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-white font-semibold text-sm">{user.name}</p>
                              <p className="text-zinc-500 text-xs">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-zinc-300 font-medium text-xs bg-zinc-950/30 px-2.5 py-1 rounded-lg border border-zinc-800/50">
                            {user.memberships[0]?.organization.name || "Individual"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {user.uniqueCode ? (
                            <span className="font-mono text-xs bg-zinc-950/60 border border-zinc-800/80 text-zinc-300 px-3 py-1.5 rounded-xl shadow-inner">
                              {user.uniqueCode}
                            </span>
                          ) : (
                            <span className="text-zinc-600 font-mono text-xs">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {user.isVerified ? (
                            <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-zinc-500 text-xs font-medium">
                          {new Date(user.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========== SMTP TAB ========== */}
        {activeTab === "smtp" && (
          <div className="space-y-8 max-w-4xl animate-fade-in">
            <div>
              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400 tracking-tight">SMTP Settings</h1>
              <p className="text-zinc-400 text-sm mt-1">
                Configure the primary mail delivery parameters and daily automated email scheduler.
              </p>
            </div>

            <form onSubmit={handleSmtpSave} className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-8 space-y-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
              
              {/* Subtle ambient light source */}
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />

              {smtpMsg && (
                <div className={`px-5 py-4 rounded-2xl text-sm font-semibold flex items-center gap-3 backdrop-blur-md transition-all duration-300 border ${
                  smtpMsg.startsWith("✅")
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                }`}>
                  <span className="text-base">{smtpMsg.startsWith("✅") ? "✨" : "⚠️"}</span>
                  <span>{smtpMsg}</span>
                </div>
              )}

              {/* SECTION 1: SMTP Connection & Authentication */}
              <div className="space-y-5">
                <div className="flex items-center gap-2.5 pb-2 border-b border-zinc-800/60">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                    <Server size={14} />
                  </div>
                  <h2 className="font-bold text-white text-sm tracking-wide uppercase">सर्व्हर कनेक्शन व प्रमाणीकरण (Server Connection & Auth)</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">SMTP Host *</label>
                    <input
                      required value={smtp.smtpHost || ""}
                      onChange={e => setSmtp(s => ({ ...s, smtpHost: e.target.value }))}
                      className="w-full px-4 py-3 bg-zinc-950/60 border border-zinc-800/80 focus:border-indigo-500/80 rounded-2xl text-white text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder-zinc-700 transition-all duration-200 shadow-inner"
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Port *</label>
                    <input
                      required type="number"
                      value={smtp.smtpPort || 587}
                      onChange={e => setSmtp(s => ({ ...s, smtpPort: parseInt(e.target.value) }))}
                      className="w-full px-4 py-3 bg-zinc-950/60 border border-zinc-800/80 focus:border-indigo-500/80 rounded-2xl text-white text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 shadow-inner"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">SMTP Username *</label>
                    <input
                      required value={smtp.smtpUser || ""}
                      onChange={e => setSmtp(s => ({ ...s, smtpUser: e.target.value }))}
                      className="w-full px-4 py-3 bg-zinc-950/60 border border-zinc-800/80 focus:border-indigo-500/80 rounded-2xl text-white text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder-zinc-700 transition-all duration-200 shadow-inner"
                      placeholder="your@gmail.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">SMTP Password *</label>
                    <input
                      required type="password"
                      value={smtp.smtpPass === "••••••••" ? "" : smtp.smtpPass || ""}
                      onChange={e => setSmtp(s => ({ ...s, smtpPass: e.target.value }))}
                      className="w-full px-4 py-3 bg-zinc-950/60 border border-zinc-800/80 focus:border-indigo-500/80 rounded-2xl text-white text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder-zinc-700 transition-all duration-200 shadow-inner"
                      placeholder="App password"
                    />
                  </div>
                  <div className="flex items-end pb-3">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div
                        onClick={() => setSmtp(s => ({ ...s, smtpSecure: !s.smtpSecure }))}
                        className={`w-12 h-6 rounded-full transition-all duration-300 flex items-center p-0.5 cursor-pointer ${
                          smtp.smtpSecure ? "bg-indigo-600 shadow-[0_0_12px_rgba(99,102,241,0.4)]" : "bg-zinc-800 border border-zinc-700"
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-md ${smtp.smtpSecure ? "translate-x-6" : "translate-x-0.5"}`} />
                      </div>
                      <span className="text-xs font-bold text-zinc-400 group-hover:text-zinc-200 transition-colors uppercase tracking-wider">SSL/TLS Secure</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Sender & App Info */}
              <div className="space-y-5">
                <div className="flex items-center gap-2.5 pb-2 border-b border-zinc-800/60">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                    <Mail size={14} />
                  </div>
                  <h2 className="font-bold text-white text-sm tracking-wide uppercase">प्रेषक आणि अॅप्लिकेशन सेटिंग्ज (Sender & App Config)</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">From Email *</label>
                    <input
                      required value={smtp.fromEmail || ""}
                      onChange={e => setSmtp(s => ({ ...s, fromEmail: e.target.value }))}
                      className="w-full px-4 py-3 bg-zinc-950/60 border border-zinc-800/80 focus:border-indigo-500/80 rounded-2xl text-white text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder-zinc-700 transition-all duration-200 shadow-inner"
                      placeholder="noreply@yourdomain.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">From Name *</label>
                    <input
                      required value={smtp.fromName || ""}
                      onChange={e => setSmtp(s => ({ ...s, fromName: e.target.value }))}
                      className="w-full px-4 py-3 bg-zinc-950/60 border border-zinc-800/80 focus:border-indigo-500/80 rounded-2xl text-white text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder-zinc-700 transition-all duration-200 shadow-inner"
                      placeholder="CallLog SaaS"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">App Name</label>
                    <input
                      value={smtp.appName || ""}
                      onChange={e => setSmtp(s => ({ ...s, appName: e.target.value }))}
                      className="w-full px-4 py-3 bg-zinc-950/60 border border-zinc-800/80 focus:border-indigo-500/80 rounded-2xl text-white text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder-zinc-700 transition-all duration-200 shadow-inner"
                      placeholder="CallLog SaaS"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">App URL</label>
                    <input
                      value={smtp.appUrl || ""}
                      onChange={e => setSmtp(s => ({ ...s, appUrl: e.target.value }))}
                      className="w-full px-4 py-3 bg-zinc-950/60 border border-zinc-800/80 focus:border-indigo-500/80 rounded-2xl text-white text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder-zinc-700 transition-all duration-200 shadow-inner"
                      placeholder="https://yourdomain.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Support Email</label>
                    <input
                      value={smtp.supportEmail || ""}
                      onChange={e => setSmtp(s => ({ ...s, supportEmail: e.target.value }))}
                      className="w-full px-4 py-3 bg-zinc-950/60 border border-zinc-800/80 focus:border-indigo-500/80 rounded-2xl text-white text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder-zinc-700 transition-all duration-200 shadow-inner"
                      placeholder="support@yourdomain.com"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: Daily Reports */}
              <div className="space-y-5">
                <div className="flex items-center gap-2.5 pb-2 border-b border-zinc-800/60">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                    <Clock size={14} />
                  </div>
                  <h2 className="font-bold text-white text-sm tracking-wide uppercase">दैनिक ऑटोमेटेड रिपोर्ट (Daily Automated Reports)</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Recipient Email</label>
                    <input
                      value={smtp.cronReportEmail || ""}
                      onChange={e => setSmtp(s => ({ ...s, cronReportEmail: e.target.value }))}
                      className="w-full px-4 py-3 bg-zinc-950/60 border border-zinc-800/80 focus:border-indigo-500/80 rounded-2xl text-white text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder-zinc-700 transition-all duration-200 shadow-inner"
                      placeholder="admin@yourdomain.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Report Time (HH:MM)</label>
                    <input
                      value={smtp.cronReportTime || "09:00"}
                      onChange={e => setSmtp(s => ({ ...s, cronReportTime: e.target.value }))}
                      className="w-full px-4 py-3 bg-zinc-950/60 border border-zinc-800/80 focus:border-indigo-500/80 rounded-2xl text-white text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder-zinc-700 transition-all duration-200 shadow-inner"
                      placeholder="09:00"
                    />
                  </div>
                  <div className="flex items-end pb-3">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div
                        onClick={() => setSmtp(s => ({ ...s, cronReportEnabled: !s.cronReportEnabled }))}
                        className={`w-12 h-6 rounded-full transition-all duration-300 flex items-center p-0.5 cursor-pointer ${
                          smtp.cronReportEnabled ? "bg-indigo-600 shadow-[0_0_12px_rgba(99,102,241,0.4)]" : "bg-zinc-800 border border-zinc-700"
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-md ${smtp.cronReportEnabled ? "translate-x-6" : "translate-x-0.5"}`} />
                      </div>
                      <span className="text-xs font-bold text-zinc-400 group-hover:text-zinc-200 transition-colors uppercase tracking-wider">Enable Daily Report</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={handleSmtpTest}
                  disabled={smtpTesting}
                  className="flex items-center justify-center gap-2.5 px-6 py-3.5 border border-zinc-800 hover:border-zinc-700 text-zinc-300 bg-zinc-950/20 hover:bg-zinc-800/40 rounded-2xl text-sm font-bold disabled:opacity-50 transition-all duration-200 active:scale-95"
                >
                  {smtpTesting ? (
                    <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send size={14} className="text-zinc-400" />
                  )}
                  Test Connection
                </button>
                <button
                  type="submit"
                  disabled={smtpSaving}
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl transition-all duration-200 text-sm shadow-[0_4px_15px_rgba(99,102,241,0.2)] active:scale-95 flex items-center justify-center gap-2"
                >
                  {smtpSaving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving Settings...
                    </>
                  ) : (
                    "Save Configuration"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========== USERS TAB ========== */}
        {activeTab === "users" && (
          <div className="space-y-8 animate-fade-in">
            <div>
              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400 tracking-tight">Registered Users</h1>
              <p className="text-zinc-400 text-sm mt-1">Full control over subscriber accounts and active organization licenses</p>
            </div>

            {/* Stats Row */}
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Total Subscribers", value: stats.total, color: "text-white bg-zinc-900/40 border-zinc-800/40" },
                  { label: "Verified Licenses", value: stats.verifiedCount, color: "text-emerald-400 bg-zinc-900/40 border-zinc-800/40 shadow-[0_4px_20px_rgba(16,185,129,0.05)]" },
                  { label: "Unverified Requests", value: stats.unverifiedCount, color: "text-amber-400 bg-zinc-900/40 border-zinc-800/40" },
                  { label: "Registered This Week", value: stats.weekCount, color: "text-indigo-400 bg-zinc-900/40 border-zinc-800/40" },
                ].map(s => (
                  <div key={s.label} className={`border backdrop-blur-md rounded-2xl p-5 text-center shadow-lg ${s.color}`}>
                    <p className="text-3xl font-black tracking-tight">{s.value}</p>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-1.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Filters and Search */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-zinc-900/20 border border-zinc-800/50 p-4 rounded-3xl backdrop-blur-md">
              <div className="relative w-full md:max-w-sm">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search by name, organization or email..."
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-zinc-500 transition-all shadow-inner"
                />
              </div>
              <div className="flex gap-1 bg-zinc-950/80 border border-zinc-800/60 rounded-2xl p-1 w-full md:w-auto overflow-x-auto shrink-0">
                {["all", "verified", "unverified"].map(f => (
                  <button
                    key={f}
                    onClick={() => setUserFilter(f)}
                    className={`px-4 py-2 text-xs font-bold rounded-xl capitalize transition-all duration-200 shrink-0 ${
                      userFilter === f
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/15"
                        : "text-zinc-400 hover:text-zinc-100"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl overflow-hidden backdrop-blur-md shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-950/40 border-b border-zinc-800/60">
                    <tr>
                      {["User Details", "Organization", "Active Plan", "License Status", "Subscription End Date", "Actions"].map(h => (
                        <th key={h} className="text-left px-6 py-4.5 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 font-semibold">
                          No registered users or organizations found
                        </td>
                      </tr>
                    ) : users.map(user => {
                      const org = user.memberships[0]?.organization;
                      const role = user.memberships[0]?.role;
                      
                      let daysLeft: number | null = null;
                      let isExpired = false;
                      if (org?.subscriptionEndDate) {
                        const end = new Date(org.subscriptionEndDate);
                        const diffTime = end.getTime() - Date.now();
                        daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        isExpired = daysLeft < 0;
                      }

                      return (
                        <tr key={user.id} className="hover:bg-zinc-800/20 transition-colors">
                          {/* Name & Details */}
                          <td className="px-6 py-4.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/10 border border-indigo-500/25 flex items-center justify-center text-sm font-bold text-indigo-300 shadow-inner">
                                {user.name[0].toUpperCase()}
                              </div>
                              <div>
                                <span className="text-white font-semibold block text-sm">{user.name}</span>
                                <span className="text-zinc-500 text-xs">{user.email}</span>
                              </div>
                            </div>
                          </td>

                          {/* Organization */}
                          <td className="px-6 py-4.5">
                            {org ? (
                              <div>
                                <p className="text-zinc-200 text-xs font-semibold bg-zinc-950/20 border border-zinc-800/40 rounded-lg px-2.5 py-1 inline-block">{org.name}</p>
                                <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mt-1 ml-0.5">{role || "MEMBER"}</p>
                              </div>
                            ) : (
                              <span className="text-zinc-600 font-mono text-xs">—</span>
                            )}
                          </td>

                          {/* Plan Badge */}
                          <td className="px-6 py-4.5">
                            {org ? (
                              org.planType === "FREE_TRIAL" ? (
                                <span className="inline-flex items-center gap-1.5 text-xs bg-violet-500/10 text-violet-400 border border-violet-500/25 px-3 py-1.5 rounded-full font-bold shadow-[0_2px_10px_rgba(139,92,246,0.05)]">
                                  ⏳ 7-Days Free Trial
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/25 px-3 py-1.5 rounded-full font-extrabold shadow-[0_2px_12px_rgba(245,158,11,0.08)]">
                                  👑 Enterprise Paid
                                </span>
                              )
                            ) : (
                              <span className="text-zinc-600 font-mono text-xs">—</span>
                            )}
                          </td>

                          {/* License Status Badge */}
                          <td className="px-6 py-4.5">
                            {org ? (
                              org.status === "ACTIVE" ? (
                                <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-semibold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1 rounded-full font-semibold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                                  Blocked
                                </span>
                              )
                            ) : (
                              <span className="text-zinc-600 font-mono text-xs">—</span>
                            )}
                          </td>

                          {/* Subscription Expiration End Date */}
                          <td className="px-6 py-4.5">
                            {org ? (
                              org.subscriptionEndDate ? (
                                isExpired ? (
                                  <div>
                                    <p className="text-rose-400 text-xs font-bold flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                                      Expired
                                    </p>
                                    <p className="text-zinc-500 text-[10px] mt-0.5">{Math.abs(daysLeft || 0)} दिवस आधी</p>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-emerald-400 text-xs font-bold flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                      {daysLeft} दिवस शिल्लक
                                    </p>
                                    <p className="text-zinc-500 text-[10px] mt-0.5">{new Date(org.subscriptionEndDate).toLocaleDateString("en-IN")}</p>
                                  </div>
                                )
                              ) : (
                                <span className="text-xs bg-zinc-950/60 border border-zinc-800/80 text-zinc-400 px-3 py-1.5 rounded-xl">Unlimited</span>
                              )
                            ) : (
                              <span className="text-zinc-600 font-mono text-xs">—</span>
                            )}
                          </td>

                          {/* Interactive Action Buttons */}
                          <td className="px-6 py-4.5">
                            {org ? (
                              <div className="flex items-center gap-2 text-xs">
                                {/* Toggle Block state */}
                                {org.status === "ACTIVE" ? (
                                  <button
                                    onClick={() => handleOrgAction(org.id, "block")}
                                    disabled={submittingOrgId === org.id}
                                    className="px-2.5 py-1.5 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 text-rose-400 rounded-xl transition-all duration-200 font-bold disabled:opacity-50 hover:scale-105"
                                  >
                                    Block
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleOrgAction(org.id, "unblock")}
                                    disabled={submittingOrgId === org.id}
                                    className="px-2.5 py-1.5 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 rounded-xl transition-all duration-200 font-bold disabled:opacity-50 hover:scale-105"
                                  >
                                    Unblock
                                  </button>
                                )}

                                {/* Upgrade/Downgrade Plan Type */}
                                {org.planType === "FREE_TRIAL" ? (
                                  <button
                                    onClick={() => handleOrgAction(org.id, "changePlan", { planType: "ACTIVE_PAID" })}
                                    disabled={submittingOrgId === org.id}
                                    className="px-2.5 py-1.5 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/25 hover:border-amber-500/40 text-amber-400 rounded-xl transition-all duration-200 font-extrabold disabled:opacity-50 hover:scale-105"
                                  >
                                    Activate
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleOrgAction(org.id, "changePlan", { planType: "FREE_TRIAL" })}
                                    disabled={submittingOrgId === org.id}
                                    className="px-2.5 py-1.5 bg-zinc-800/30 hover:bg-zinc-800/60 border border-zinc-700/40 text-zinc-300 rounded-xl transition-all duration-200 font-semibold disabled:opacity-50 hover:scale-105"
                                  >
                                    Downgrade
                                  </button>
                                )}

                                {/* Extend Sub duration */}
                                <button
                                  onClick={() => {
                                    setExtendModalOrg({ id: org.id, name: org.name, endDate: org.subscriptionEndDate });
                                    setCustomDays(30);
                                  }}
                                  className="px-2.5 py-1.5 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/25 hover:border-indigo-500/45 text-indigo-400 rounded-xl transition-all duration-200 font-bold hover:scale-105"
                                >
                                  Extend
                                </button>
                              </div>
                            ) : (
                              <span className="text-zinc-600 font-mono text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========== CRON TAB ========== */}
        {activeTab === "cron" && (
          <div className="space-y-8 max-w-4xl animate-fade-in">
            <div>
              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400 tracking-tight">Cron Jobs</h1>
              <p className="text-zinc-400 text-sm mt-1">Automated background tasks. Trigger manually for testing or run logs generation.</p>
            </div>

            {cronMsg && (
              <div className={`px-5 py-4 rounded-2xl text-sm font-semibold flex items-center gap-3 backdrop-blur-md transition-all duration-300 border ${
                cronMsg.startsWith("✅")
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-400"
              }`}>
                <span className="text-base">{cronMsg.startsWith("✅") ? "✨" : "⚠️"}</span>
                <span>{cronMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6">
              {cronJobs.map(job => (
                <div key={job.action} className="group relative bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 backdrop-blur-md transition-all duration-300 hover:border-zinc-700/60 shadow-lg">
                  <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/10 transition-all duration-300" />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                          <Clock size={15} className="animate-pulse" />
                        </div>
                        <h3 className="font-bold text-white text-base tracking-wide">{job.name}</h3>
                      </div>
                      <p className="text-zinc-400 text-sm leading-relaxed max-w-xl">{job.description}</p>
                      <div className="flex items-center gap-4 pt-1">
                        <span className="text-xs font-mono bg-zinc-950/80 border border-zinc-800/50 text-indigo-400 px-3 py-1.5 rounded-xl shadow-inner">
                          🕒 Schedule: <span className="text-zinc-300 font-bold">{job.schedule}</span>
                        </span>
                      </div>
                    </div>
                    {job.canTriggerManually && (
                      <button
                        onClick={() => handleCronTrigger(job.action, job.name)}
                        disabled={cronRunning === job.action}
                        className="flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 text-white rounded-2xl text-sm font-bold transition-all duration-200 shadow-md active:scale-95 shrink-0"
                      >
                        {cronRunning === job.action ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Running...
                          </>
                        ) : (
                          <>
                            <Play size={14} className="fill-current text-white" />
                            Run Now
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Developer Setup Instructions Terminal */}
            <div className="bg-zinc-950/90 border border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl relative">
              {/* Terminal Window Header */}
              <div className="px-6 py-4.5 bg-zinc-900/60 border-b border-zinc-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  <span className="text-xs text-zinc-500 font-mono ml-2">license-scheduler-setup.sh</span>
                </div>
                <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider font-mono">Dev Setup</span>
              </div>
              <div className="p-6 space-y-4 font-mono text-xs text-zinc-300 leading-relaxed">
                <div className="flex items-start gap-2">
                  <span className="text-indigo-500 font-bold">▶</span>
                  <p className="text-zinc-400">Install scheduler daemon library dependencies:</p>
                </div>
                <div className="bg-zinc-900/80 border border-zinc-800/80 p-4 rounded-2xl relative shadow-inner group">
                  <code className="text-indigo-300 select-all block font-semibold">
                    npm install node-cron @types/node-cron
                  </code>
                </div>
                <div className="flex items-start gap-2 pt-2">
                  <span className="text-indigo-500 font-bold">▶</span>
                  <p className="text-zinc-400">Bootstrap cron jobs into your application lifecycle:</p>
                </div>
                <div className="bg-zinc-900/80 border border-zinc-800/80 p-4 rounded-2xl relative shadow-inner">
                  <pre className="text-zinc-400 text-[11px] overflow-x-auto whitespace-pre">
                    <span className="text-purple-400">import</span> {"{"} <span className="text-indigo-400">startCronJobs</span> {"}"} <span className="text-purple-400">from</span> <span className="text-emerald-400">"@/lib/license-cron"</span>;
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ── Extend Period Modal ── */}
      {extendModalOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 backdrop-blur-xl p-4 animate-fade-in">
          <div className="relative bg-zinc-900/80 border border-zinc-800/80 rounded-3xl p-8 max-w-md w-full space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
            
            {/* Subtle glow effect behind modal */}
            <div className="absolute -top-16 -left-16 w-36 h-36 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none" />

            <div>
              <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>⏱️</span> Subscription कालावधी वाढवा
              </h3>
              <p className="text-xs text-zinc-400 mt-2 bg-zinc-950/40 border border-zinc-800/60 px-3 py-2 rounded-xl inline-block">
                कंपनी: <span className="text-indigo-400 font-bold">{extendModalOrg.name}</span>
              </p>
              {extendModalOrg.endDate && (
                <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-650" />
                  सध्याची संपण्याची तारीख: <span className="text-zinc-300 font-bold">{new Date(extendModalOrg.endDate).toLocaleDateString("en-IN")}</span>
                </p>
              )}
            </div>

            <div className="space-y-3.5">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">कालावधी (दिवसांची संख्या निवडा)</label>
              
              {/* Neon preset days pills */}
              <div className="grid grid-cols-3 gap-2.5">
                {[7, 30, 90, 180, 365].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setCustomDays(d)}
                    className={`py-2.5 px-1.5 text-xs rounded-xl font-bold border transition-all duration-200 hover:scale-105 active:scale-95 ${
                      customDays === d
                        ? "bg-gradient-to-r from-indigo-500 to-violet-600 border-indigo-500 text-white shadow-[0_4px_12px_rgba(99,102,241,0.35)]"
                        : "bg-zinc-950/40 border-zinc-800/80 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700"
                    }`}
                  >
                    +{d} दिवस
                  </button>
                ))}
                
                {/* Custom days manual input */}
                <div className="relative">
                  <input
                    type="number"
                    value={customDays}
                    onChange={e => setCustomDays(parseInt(e.target.value) || 0)}
                    placeholder="इतर"
                    className="w-full px-2.5 py-2.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl text-white text-center text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-zinc-650"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={() => setExtendModalOrg(null)}
                className="flex-1 py-3 bg-zinc-950/40 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/30 text-zinc-400 hover:text-zinc-200 rounded-2xl text-xs font-bold transition-all duration-200 active:scale-95"
              >
                रद्द करा
              </button>
              <button
                type="button"
                onClick={() => handleOrgAction(extendModalOrg.id, "extend", { days: customDays })}
                disabled={submittingOrgId === extendModalOrg.id}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 text-white font-extrabold py-3 rounded-2xl transition-all duration-200 text-xs shadow-[0_4px_12px_rgba(99,102,241,0.25)] active:scale-95 flex items-center justify-center gap-1.5"
              >
                {submittingOrgId === extendModalOrg.id ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    वाढवत आहे...
                  </>
                ) : (
                  "कालावधी वाढवा"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
