"use client";
// src/app/license/dashboard/page.tsx
// URL: http://localhost:3000/license/dashboard

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Shield, Users, Building2, Phone, LogOut,
  Settings, Mail, RefreshCw, CheckCircle,
  XCircle, Clock, Search, Send, Play,
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
  memberships: { role: string; organization: { id: string; name: string } }[];
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
    <div className="min-h-screen bg-gray-950 flex">

      {/* ── Sidebar ── */}
      <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-800">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">License Manager</p>
            <p className="text-gray-500 text-xs">Super Admin</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ tab, label, icon: Icon }) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                activeTab === tab
                  ? "bg-indigo-600 text-white font-medium"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        {/* Admin info + Logout */}
        <div className="px-4 py-4 border-t border-gray-800">
          {admin && (
            <div className="mb-3">
              <p className="text-xs font-medium text-white truncate">{admin.name}</p>
              <p className="text-xs text-gray-500 truncate">{admin.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-xl transition-colors"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto p-8">

        {/* ========== DASHBOARD TAB ========== */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Dashboard</h1>
              <p className="text-gray-400 text-sm mt-1">System overview</p>
            </div>

            {/* KPI Cards */}
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 animate-pulse h-28" />
                ))}
              </div>
            ) : stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Users", value: stats.total, icon: Users, color: "bg-blue-500/20 text-blue-400" },
                  { label: "Verified", value: stats.verifiedCount, icon: CheckCircle, color: "bg-green-500/20 text-green-400" },
                  { label: "Unverified", value: stats.unverifiedCount, icon: XCircle, color: "bg-red-500/20 text-red-400" },
                  { label: "New Today", value: stats.todayCount, icon: RefreshCw, color: "bg-purple-500/20 text-purple-400" },
                ].map(card => {
                  const Icon = card.icon;
                  return (
                    <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">{card.label}</p>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.color}`}>
                          <Icon size={14} />
                        </div>
                      </div>
                      <p className="text-3xl font-bold text-white">{card.value}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Recent Users */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                <h2 className="font-semibold text-white">Recent Registrations</h2>
                <button
                  onClick={() => setActiveTab("users")}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  View all →
                </button>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-800/50">
                  <tr>
                    {["Name", "Email", "Organization", "Code", "Verified", "Joined"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No users yet</td>
                    </tr>
                  ) : users.map(user => (
                    <tr key={user.id} className="hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-white font-medium">{user.name}</td>
                      <td className="px-4 py-3 text-gray-400">{user.email}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {user.memberships[0]?.organization.name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {user.uniqueCode ? (
                          <span className="font-mono text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded-lg">
                            {user.uniqueCode}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {user.isVerified
                          ? <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full font-medium">✓ Verified</span>
                          : <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full font-medium">⏳ Pending</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(user.createdAt).toLocaleDateString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========== SMTP TAB ========== */}
        {activeTab === "smtp" && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h1 className="text-2xl font-bold text-white">SMTP Settings</h1>
              <p className="text-gray-400 text-sm mt-1">
                Configure email server. Used for verification, forgot password, and daily reports.
              </p>
            </div>

            <form onSubmit={handleSmtpSave} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">

              {smtpMsg && (
                <div className={`px-4 py-3 rounded-xl text-sm ${
                  smtpMsg.startsWith("✅")
                    ? "bg-green-500/10 border border-green-500/30 text-green-400"
                    : "bg-red-500/10 border border-red-500/30 text-red-400"
                }`}>
                  {smtpMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">SMTP Host *</label>
                  <input
                    required value={smtp.smtpHost || ""}
                    onChange={e => setSmtp(s => ({ ...s, smtpHost: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Port *</label>
                  <input
                    required type="number"
                    value={smtp.smtpPort || 587}
                    onChange={e => setSmtp(s => ({ ...s, smtpPort: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">SMTP Username *</label>
                  <input
                    required value={smtp.smtpUser || ""}
                    onChange={e => setSmtp(s => ({ ...s, smtpUser: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="your@gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">SMTP Password *</label>
                  <input
                    required type="password"
                    value={smtp.smtpPass === "••••••••" ? "" : smtp.smtpPass || ""}
                    onChange={e => setSmtp(s => ({ ...s, smtpPass: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="App password"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">From Email *</label>
                  <input
                    required value={smtp.fromEmail || ""}
                    onChange={e => setSmtp(s => ({ ...s, fromEmail: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="noreply@yourdomain.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">From Name *</label>
                  <input
                    required value={smtp.fromName || ""}
                    onChange={e => setSmtp(s => ({ ...s, fromName: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="CallLog SaaS"
                  />
                </div>
              </div>

              <hr className="border-gray-800" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">App Name</label>
                  <input
                    value={smtp.appName || ""}
                    onChange={e => setSmtp(s => ({ ...s, appName: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="CallLog SaaS"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">App URL</label>
                  <input
                    value={smtp.appUrl || ""}
                    onChange={e => setSmtp(s => ({ ...s, appUrl: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://yourdomain.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Support Email</label>
                  <input
                    value={smtp.supportEmail || ""}
                    onChange={e => setSmtp(s => ({ ...s, supportEmail: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="support@yourdomain.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Daily Report Email</label>
                  <input
                    value={smtp.cronReportEmail || ""}
                    onChange={e => setSmtp(s => ({ ...s, cronReportEmail: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="admin@yourdomain.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Report Time (HH:MM)</label>
                  <input
                    value={smtp.cronReportTime || "09:00"}
                    onChange={e => setSmtp(s => ({ ...s, cronReportTime: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="09:00"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => setSmtp(s => ({ ...s, cronReportEnabled: !s.cronReportEnabled }))}
                      className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${smtp.cronReportEnabled ? "bg-indigo-600" : "bg-gray-700"}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full mt-0.5 transition-transform ${smtp.cronReportEnabled ? "translate-x-6" : "translate-x-0.5"}`} />
                    </div>
                    <span className="text-sm text-gray-300">Enable Daily Report</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSmtpTest}
                  disabled={smtpTesting}
                  className="flex items-center gap-2 px-5 py-2.5 border border-gray-700 text-gray-300 hover:bg-gray-800 rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {smtpTesting
                    ? <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    : <Send size={14} />
                  }
                  Test Connection
                </button>
                <button
                  type="submit"
                  disabled={smtpSaving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
                >
                  {smtpSaving ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========== USERS TAB ========== */}
        {activeTab === "users" && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-white">Registered Users</h1>
              <p className="text-gray-400 text-sm mt-1">All users registered in the system</p>
            </div>

            {/* Stats Row */}
            {stats && (
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Total", value: stats.total, color: "text-white" },
                  { label: "Verified", value: stats.verifiedCount, color: "text-green-400" },
                  { label: "Unverified", value: stats.unverifiedCount, color: "text-yellow-400" },
                  { label: "This Week", value: stats.weekCount, color: "text-blue-400" },
                ].map(s => (
                  <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Filters */}
            <div className="flex gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search name or email..."
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
                />
              </div>
              <div className="flex gap-1 bg-gray-900 border border-gray-700 rounded-xl p-1">
                {["all", "verified", "unverified"].map(f => (
                  <button
                    key={f}
                    onClick={() => setUserFilter(f)}
                    className={`px-3 py-1.5 text-sm rounded-lg capitalize transition-colors ${
                      userFilter === f
                        ? "bg-indigo-600 text-white font-medium"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/50 border-b border-gray-800">
                  <tr>
                    {["Name", "Email", "Organization", "Role", "Code", "Call Logs", "Verified", "Joined"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                        No users found
                      </td>
                    </tr>
                  ) : users.map(user => (
                    <tr key={user.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400">
                            {user.name[0].toUpperCase()}
                          </div>
                          <span className="text-white font-medium">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{user.email}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {user.memberships[0]?.organization.name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {user.memberships[0]?.role
                          ? <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded-lg">{user.memberships[0].role}</span>
                          : "—"
                        }
                      </td>
                      <td className="px-4 py-3">
                        {user.uniqueCode
                          ? <span className="font-mono text-xs bg-gray-800 text-indigo-400 px-2 py-1 rounded-lg">{user.uniqueCode}</span>
                          : "—"
                        }
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-center">{user._count.importedLogs}</td>
                      <td className="px-4 py-3">
                        {user.isVerified
                          ? <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">✓ Yes</span>
                          : <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">⏳ No</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(user.createdAt).toLocaleDateString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========== CRON TAB ========== */}
        {activeTab === "cron" && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h1 className="text-2xl font-bold text-white">Cron Jobs</h1>
              <p className="text-gray-400 text-sm mt-1">Automated background tasks. Trigger manually for testing.</p>
            </div>

            {cronMsg && (
              <div className={`px-4 py-3 rounded-xl text-sm ${
                cronMsg.startsWith("✅")
                  ? "bg-green-500/10 border border-green-500/30 text-green-400"
                  : "bg-red-500/10 border border-red-500/30 text-red-400"
              }`}>
                {cronMsg}
              </div>
            )}

            <div className="space-y-3">
              {cronJobs.map(job => (
                <div key={job.action} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock size={15} className="text-indigo-400" />
                        <h3 className="font-semibold text-white">{job.name}</h3>
                      </div>
                      <p className="text-sm text-gray-400 mb-1">{job.description}</p>
                      <p className="text-xs text-gray-600">
                        Schedule: <span className="text-gray-400">{job.schedule}</span>
                      </p>
                    </div>
                    {job.canTriggerManually && (
                      <button
                        onClick={() => handleCronTrigger(job.action, job.name)}
                        disabled={cronRunning === job.action}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors shrink-0"
                      >
                        {cronRunning === job.action
                          ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : <Play size={13} />
                        }
                        {cronRunning === job.action ? "Running..." : "Run Now"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-sm text-yellow-400">
              <p className="font-semibold mb-1">⚠️ Setup Required</p>
              <p>Install node-cron to enable automatic scheduling:</p>
              <code className="block mt-2 bg-gray-900 px-3 py-2 rounded-lg text-xs font-mono">
                npm install node-cron @types/node-cron
              </code>
              <p className="mt-2">Then add to your app startup: <code className="text-xs">import {"{"} startCronJobs {"}"} from "@/lib/license-cron";</code></p>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
