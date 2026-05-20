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

interface OrganizationMemberInfo {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    isVerified: boolean;
    createdAt: string;
  };
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  status: string;
  planType: string;
  subscriptionEndDate: string | null;
  createdAt: string;
  updatedAt: string;
  members: OrganizationMemberInfo[];
  _count: {
    members: number;
    callLogs: number;
    registeredSIMs: number;
  };
}

type Tab = "dashboard" | "smtp" | "organizations" | "users" | "cron";

// =============================================================
// MAIN COMPONENT
// =============================================================
export default function LicenseDashboard() {
  const router = useRouter();
  const [theme, setTheme] = useState<"dark" | "light">("light");
  
  useEffect(() => {
    const savedTheme = localStorage.getItem("license-theme") as "dark" | "light";
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("license-theme", nextTheme);
  };

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

  // Organizations tab
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [orgSearch, setOrgSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState("all");
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [orgMemberSearch, setOrgMemberSearch] = useState("");
  const [orgsLoading, setOrgsLoading] = useState(false);

  // Confirmation dialog
  const [confirmAction, setConfirmAction] = useState<{
    orgId: string;
    orgName: string;
    action: string;
    payload?: any;
    title: string;
    message: string;
    icon: string;
    confirmLabel: string;
    confirmClass: string;
  } | null>(null);

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

  const fetchOrganizations = useCallback(async () => {
    setOrgsLoading(true);
    try {
      const params = new URLSearchParams({
        filter: orgFilter,
        ...(orgSearch ? { search: orgSearch } : {}),
      });
      const res = await fetch(`/api/license/organizations?${params}`);
      const data = await res.json();
      if (data.success) {
        setOrganizations(data.data.organizations);
      }
    } catch (err) {
      console.error("Failed fetching organizations:", err);
    } finally {
      setOrgsLoading(false);
    }
  }, [orgFilter, orgSearch]);

  useEffect(() => { fetchAdmin(); fetchDashboardData(); }, []);
  useEffect(() => { if (activeTab === "users") fetchAllUsers(); }, [activeTab, userFilter, userSearch]);
  useEffect(() => { if (activeTab === "organizations") fetchOrganizations(); }, [activeTab, orgFilter, orgSearch, fetchOrganizations]);

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
    setConfirmAction(null);
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
        fetchOrganizations();
        if (extendModalOrg) setExtendModalOrg(null);
        setSelectedOrg(prev => {
          if (!prev || prev.id !== orgId) return prev;
          if (action === "block") return { ...prev, status: "BLOCKED" };
          if (action === "unblock") return { ...prev, status: "ACTIVE" };
          if (action === "changePlan") return { ...prev, planType: payload.planType };
          if (action === "extend") {
            const newDate = prev.subscriptionEndDate ? new Date(prev.subscriptionEndDate) : new Date();
            newDate.setDate(newDate.getDate() + payload.days);
            return { ...prev, subscriptionEndDate: newDate.toISOString() };
          }
          return prev;
        });
      } else {
        alert(`Error: ${data.message || "Failed to make changes."}`);
      }
    } catch (err) {
      console.error(err);
      alert("Could not connect to the server.");
    } finally {
      setSubmittingOrgId(null);
    }
  }

  function triggerConfirm(org: Organization, action: string, payload?: any) {
    const configs: Record<string, { title: string; message: string; icon: string; confirmLabel: string; confirmClass: string }> = {
      block: {
        title: "Block Organization",
        message: `All members of "${org.name}" will immediately lose access to the platform. Their data will be preserved and access can be restored at any time.`,
        icon: "🔒",
        confirmLabel: "Block Access",
        confirmClass: "bg-rose-600 hover:bg-rose-700 text-white",
      },
      unblock: {
        title: "Restore Organization Access",
        message: `"${org.name}" will regain full access to the platform. All members will be able to log in and use their accounts immediately.`,
        icon: "✅",
        confirmLabel: "Restore Access",
        confirmClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
      },
      changePlan_ACTIVE_PAID: {
        title: "Activate Paid Subscription",
        message: `"${org.name}" will be upgraded to Enterprise Paid plan. Please ensure payment has been confirmed before proceeding with this activation.`,
        icon: "👑",
        confirmLabel: "Activate Enterprise",
        confirmClass: "bg-amber-500 hover:bg-amber-600 text-white",
      },
      changePlan_FREE_TRIAL: {
        title: "Downgrade to Free Trial",
        message: `"${org.name}" will be downgraded to the 7-Day Free Trial plan. Enterprise features will be disabled for all members.`,
        icon: "⬇️",
        confirmLabel: "Confirm Downgrade",
        confirmClass: "bg-slate-600 hover:bg-slate-700 text-white",
      },
    };
    const key = action === "changePlan" ? `changePlan_${payload?.planType}` : action;
    const config = configs[key];
    if (!config) { handleOrgAction(org.id, action, payload); return; }
    setConfirmAction({ orgId: org.id, orgName: org.name, action, payload, ...config });
  }

  // =============================================================
  // NAV ITEMS
  // =============================================================
  const NAV_ITEMS: { tab: Tab; label: string; icon: any }[] = [
    { tab: "dashboard", label: "Dashboard", icon: Shield },
    { tab: "organizations", label: "Organizations", icon: Building2 },
    { tab: "users", label: "Users", icon: Users },
    { tab: "smtp", label: "SMTP Settings", icon: Mail },
    { tab: "cron", label: "Cron Jobs", icon: Clock },
  ];

  // =============================================================
  // RENDER
  // =============================================================
  return (
    <div className={theme}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-zinc-100 to-slate-100 text-slate-800 dark:from-zinc-950 dark:via-slate-900 dark:to-zinc-950 dark:text-slate-100 flex font-sans transition-colors duration-300">

        {/* ── Sidebar ── */}
        <aside className="w-64 bg-white/85 dark:bg-zinc-900/60 backdrop-blur-xl border-r border-slate-200 dark:border-zinc-800/80 flex flex-col shrink-0 transition-colors duration-300">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-200 dark:border-zinc-800/80">
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.4)]">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-800 to-zinc-700 dark:from-white dark:to-zinc-300 text-sm tracking-wide">License Manager</p>
              <p className="text-indigo-600 dark:text-indigo-400 font-medium text-[10px] uppercase tracking-wider">Super Admin</p>
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
                      ? "bg-indigo-50 dark:bg-indigo-500/10 border-l-2 border-indigo-650 dark:border-indigo-500 text-indigo-655 dark:text-white font-semibold"
                      : "text-slate-555 hover:bg-slate-100/80 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800/40 dark:hover:text-zinc-100 hover:translate-x-1"
                  }`}
                >
                  <Icon size={16} className={isActive ? "text-indigo-655 dark:text-indigo-405 animate-pulse" : "text-slate-400 dark:text-zinc-500"} />
                  {label}
                </button>
              );
            })}
          </nav>

          {/* Admin info + Logout */}
          <div className="p-4 border-t border-slate-200 dark:border-zinc-800/80">
            {admin && (
              <div className="mb-3 bg-slate-50 dark:bg-zinc-950/40 border border-slate-205 dark:border-zinc-805/60 rounded-2xl p-3 shadow-inner">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs">
                    {admin.name[0].toUpperCase()}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{admin.name}</p>
                    <p className="text-[10px] text-slate-555 dark:text-zinc-500 truncate">{admin.email}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Theme Switcher Button */}
            <button
              onClick={toggleTheme}
              className="w-full mb-2 flex items-center justify-between px-4 py-2 text-xs font-bold text-slate-650 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-105 dark:bg-zinc-950/20 hover:bg-indigo-50/80 dark:hover:bg-indigo-500/10 border border-slate-200 dark:border-zinc-850 hover:border-indigo-200 dark:hover:border-indigo-500/20 rounded-xl transition-all duration-200 shadow-sm"
            >
              <span className="flex items-center gap-2">
                {theme === "dark" ? "🌙 Dark Mode" : "☀️ Light Mode"}
              </span>
              <span className="text-[10px] text-indigo-655 dark:text-indigo-400 uppercase tracking-wider font-bold">Toggle</span>
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-red-655 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 border border-transparent hover:border-red-200 dark:hover:border-red-500/20 rounded-xl transition-all duration-205"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 p-8 overflow-y-auto space-y-8 relative">
        
        {/* ========== DASHBOARD TAB ========== */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-805 to-slate-700 dark:from-white dark:via-zinc-200 dark:to-zinc-400 tracking-tight">Dashboard</h1>
              <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">System-wide license and subscriber insights</p>
            </div>

            {/* KPI Cards */}
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[1,2,3,4].map(i => (
                  <div key={i} className="bg-white dark:bg-zinc-900/40 border border-slate-202 dark:border-zinc-800/50 rounded-3xl p-6 animate-pulse h-32" />
                ))}
              </div>
            ) : stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Total Users", value: stats.total, icon: Users, color: "from-blue-500/10 to-indigo-500/5 text-blue-600 border-blue-500/20 dark:from-blue-500/20 dark:to-indigo-500/10 dark:text-blue-400 dark:border-blue-500/20 hover:shadow-blue-500/5", glow: "rgba(59,130,246,0.15)", lightGlow: "rgba(59,130,246,0.06)" },
                  { label: "Verified", value: stats.verifiedCount, icon: CheckCircle, color: "from-emerald-500/10 to-teal-500/5 text-emerald-600 border-emerald-500/20 dark:from-emerald-500/20 dark:to-teal-505 dark:text-emerald-400 dark:border-emerald-500/20 hover:shadow-emerald-500/5", glow: "rgba(16,185,129,0.15)", lightGlow: "rgba(16,185,129,0.06)" },
                  { label: "Unverified", value: stats.unverifiedCount, icon: XCircle, color: "from-rose-500/10 to-red-500/5 text-rose-600 border-rose-500/20 dark:from-rose-500/20 dark:to-red-500/10 dark:text-rose-400 dark:border-rose-500/20 hover:shadow-rose-500/5", glow: "rgba(244,63,94,0.15)", lightGlow: "rgba(244,63,94,0.06)" },
                  { label: "New Today", value: stats.todayCount, icon: RefreshCw, color: "from-purple-500/10 to-fuchsia-500/5 text-purple-600 border-purple-500/20 dark:from-purple-500/20 dark:to-fuchsia-500/10 dark:text-purple-400 dark:border-purple-500/20 hover:shadow-purple-500/5", glow: "rgba(168,85,247,0.15)", lightGlow: "rgba(168,85,247,0.06)" },
                ].map(card => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.label}
                      className="bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800/50 backdrop-blur-md rounded-3xl p-6 transition-all duration-305 hover:-translate-y-1.5 hover:border-slate-350 dark:hover:border-zinc-700/60"
                      style={{
                        boxShadow: theme === "dark" ? "0 4px 20px -2px rgba(0,0,0,0.3)" : "0 4px 15px -3px rgba(0,0,0,0.05)"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = theme === "dark" ? `0 12px 25px -5px ${card.glow}` : `0 10px 20px -3px ${card.lightGlow}`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = theme === "dark" ? "0 4px 20px -2px rgba(0,0,0,0.3)" : "0 4px 15px -3px rgba(0,0,0,0.05)";
                      }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs text-slate-555 dark:text-zinc-400 font-bold uppercase tracking-wider">{card.label}</p>
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-tr border ${card.color} shadow-inner`}>
                          <Icon size={16} />
                        </div>
                      </div>
                      <p className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">{card.value}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Recent Users */}
            <div className="bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800/80 rounded-3xl overflow-hidden backdrop-blur-md shadow-md dark:shadow-xl transition-colors duration-300">
              <div className="px-6 py-5 border-b border-slate-200 dark:border-zinc-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-900/20 transition-colors duration-300">
                <h2 className="font-bold text-slate-900 dark:text-white text-lg tracking-tight">Recent Registrations</h2>
                <button
                  onClick={() => setActiveTab("users")}
                  className="text-xs font-bold text-indigo-650 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all shadow-sm"
                >
                  View all registrations →
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/80 dark:bg-zinc-950/40 border-b border-slate-205 dark:border-zinc-800/60 transition-colors duration-300">
                    <tr>
                      {["User Details", "Organization", "License Code", "Status", "Joined On"].map(h => (
                        <th key={h} className="text-left px-6 py-4 text-xs font-bold text-slate-555 dark:text-zinc-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50 transition-colors duration-300">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-405 dark:text-zinc-550 font-medium">No recent registrations found</td>
                      </tr>
                    ) : users.map(user => (
                      <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-colors duration-200">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500/10 to-purple-500/5 dark:from-indigo-500/20 dark:to-purple-500/10 border border-indigo-100 dark:border-indigo-500/25 flex items-center justify-center text-sm font-bold text-indigo-655 dark:text-indigo-300 shadow-sm">
                              {user.name[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-slate-900 dark:text-white font-semibold text-sm">{user.name}</p>
                              <p className="text-slate-555 dark:text-zinc-500 text-xs">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-705 dark:text-zinc-300 font-semibold text-xs bg-slate-50 dark:bg-zinc-950/30 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-800/50">
                            {user.memberships[0]?.organization.name || "Individual"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {user.uniqueCode ? (
                            <span className="font-mono text-xs bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800/80 text-slate-700 dark:text-zinc-300 px-3 py-1.5 rounded-xl shadow-inner">
                              {user.uniqueCode}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-zinc-650 font-mono text-xs">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {user.isVerified ? (
                            <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 dark:bg-emerald-500/10 text-emerald-655 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 px-3 py-1 rounded-full font-semibold whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs bg-amber-50 dark:bg-amber-500/10 text-amber-655 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20 px-3 py-1 rounded-full font-semibold whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-555 dark:bg-amber-400 animate-pulse" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-400 dark:text-zinc-550 text-xs font-semibold">
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
              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-850 to-slate-700 dark:from-white dark:via-zinc-200 dark:to-zinc-400 tracking-tight">SMTP Settings</h1>
              <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">
                Configure the primary mail delivery parameters and daily automated email scheduler.
              </p>
            </div>

            <form onSubmit={handleSmtpSave} className="bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800/80 rounded-3xl p-8 space-y-8 backdrop-blur-md shadow-md dark:shadow-2xl relative overflow-hidden transition-colors duration-300">
              
              {/* Subtle ambient light source */}
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />

              {smtpMsg && (
                <div className={`px-5 py-4 rounded-2xl text-sm font-semibold flex items-center gap-3 backdrop-blur-md transition-all duration-300 border ${
                  smtpMsg.startsWith("✅")
                    ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400"
                }`}>
                  <span className="text-base">{smtpMsg.startsWith("✅") ? "✨" : "⚠️"}</span>
                  <span>{smtpMsg}</span>
                </div>
              )}

              {/* SECTION 1: SMTP Connection & Authentication */}
              <div className="space-y-5">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 dark:border-zinc-800/60">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20 text-indigo-655 dark:text-indigo-400">
                    <Server size={14} />
                  </div>
                  <h2 className="font-bold text-slate-800 dark:text-white text-sm tracking-wide uppercase">Server Connection & Authentication</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-555 dark:text-zinc-400 uppercase tracking-wider mb-2">SMTP Host *</label>
                    <input
                      required value={smtp.smtpHost || ""}
                      onChange={e => setSmtp(s => ({ ...s, smtpHost: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-805/80 focus:border-indigo-500/80 rounded-2xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder-slate-400 dark:placeholder-zinc-705 transition-all duration-200 shadow-inner"
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-555 dark:text-zinc-400 uppercase tracking-wider mb-2">Port *</label>
                    <input
                      required type="number"
                      value={smtp.smtpPort || 587}
                      onChange={e => setSmtp(s => ({ ...s, smtpPort: parseInt(e.target.value) }))}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800/80 focus:border-indigo-500/80 rounded-2xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 shadow-inner"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-555 dark:text-zinc-400 uppercase tracking-wider mb-2">SMTP Username *</label>
                    <input
                      required value={smtp.smtpUser || ""}
                      onChange={e => setSmtp(s => ({ ...s, smtpUser: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950/60 border border-slate-205 dark:border-zinc-800/80 focus:border-indigo-500/80 rounded-2xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder-slate-400 dark:placeholder-zinc-705 transition-all duration-200 shadow-inner"
                      placeholder="your@gmail.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-555 dark:text-zinc-400 uppercase tracking-wider mb-2">SMTP Password *</label>
                    <input
                      required type="password"
                      value={smtp.smtpPass === "••••••••" ? "" : smtp.smtpPass || ""}
                      onChange={e => setSmtp(s => ({ ...s, smtpPass: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950/60 border border-slate-205 dark:border-zinc-805/80 focus:border-indigo-500/80 rounded-2xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder-slate-400 dark:placeholder-zinc-705 transition-all duration-200 shadow-inner"
                      placeholder="App password"
                    />
                  </div>
                  <div className="flex items-end pb-3">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div
                        onClick={() => setSmtp(s => ({ ...s, smtpSecure: !s.smtpSecure }))}
                        className={`w-12 h-6 rounded-full transition-all duration-300 flex items-center p-0.5 cursor-pointer ${
                          smtp.smtpSecure ? "bg-indigo-650 shadow-[0_0_12px_rgba(99,102,241,0.4)]" : "bg-slate-200 border border-slate-300 dark:bg-zinc-800 dark:border-zinc-700"
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-md ${smtp.smtpSecure ? "translate-x-6" : "translate-x-0.5"}`} />
                      </div>
                      <span className="text-xs font-bold text-slate-555 dark:text-zinc-400 group-hover:text-slate-800 dark:group-hover:text-zinc-200 transition-colors uppercase tracking-wider">SSL/TLS Secure</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Sender & App Info */}
              <div className="space-y-5">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 dark:border-zinc-800/60">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20 text-indigo-655 dark:text-indigo-400">
                    <Mail size={14} />
                  </div>
                  <h2 className="font-bold text-slate-800 dark:text-white text-sm tracking-wide uppercase">Sender & Application Configuration</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-555 dark:text-zinc-400 uppercase tracking-wider mb-2">From Email *</label>
                    <input
                      required value={smtp.fromEmail || ""}
                      onChange={e => setSmtp(s => ({ ...s, fromEmail: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950/60 border border-slate-205 dark:border-zinc-800/80 focus:border-indigo-505 rounded-2xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder-slate-400 dark:placeholder-zinc-705 transition-all duration-200 shadow-inner"
                      placeholder="noreply@yourdomain.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-555 dark:text-zinc-400 uppercase tracking-wider mb-2">From Name *</label>
                    <input
                      required value={smtp.fromName || ""}
                      onChange={e => setSmtp(s => ({ ...s, fromName: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800/80 focus:border-indigo-500/80 rounded-2xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder-slate-400 dark:placeholder-zinc-705 transition-all duration-200 shadow-inner"
                      placeholder="CallLog SaaS"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-555 dark:text-zinc-400 uppercase tracking-wider mb-2">App Name</label>
                    <input
                      value={smtp.appName || ""}
                      onChange={e => setSmtp(s => ({ ...s, appName: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-805/80 focus:border-indigo-500/80 rounded-2xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder-slate-400 dark:placeholder-zinc-705 transition-all duration-200 shadow-inner"
                      placeholder="CallLog SaaS"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-555 dark:text-zinc-400 uppercase tracking-wider mb-2">App URL</label>
                    <input
                      value={smtp.appUrl || ""}
                      onChange={e => setSmtp(s => ({ ...s, appUrl: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950/60 border border-slate-202 dark:border-zinc-805/80 focus:border-indigo-500/80 rounded-2xl text-slate-905 dark:text-white text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder-slate-400 dark:placeholder-zinc-700 transition-all duration-205 shadow-inner"
                      placeholder="https://yourdomain.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-555 dark:text-zinc-400 uppercase tracking-wider mb-2">Support Email</label>
                    <input
                      value={smtp.supportEmail || ""}
                      onChange={e => setSmtp(s => ({ ...s, supportEmail: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800/80 focus:border-indigo-500/80 rounded-2xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder-slate-400 dark:placeholder-zinc-705 transition-all duration-200 shadow-inner"
                      placeholder="support@yourdomain.com"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: Daily Reports */}
              <div className="space-y-5">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 dark:border-zinc-800/60">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20 text-indigo-655 dark:text-indigo-400">
                    <Clock size={14} />
                  </div>
                  <h2 className="font-bold text-slate-805 dark:text-white text-sm tracking-wide uppercase">Daily Automated Reports</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-555 dark:text-zinc-400 uppercase tracking-wider mb-2">Recipient Email</label>
                    <input
                      value={smtp.cronReportEmail || ""}
                      onChange={e => setSmtp(s => ({ ...s, cronReportEmail: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950/60 border border-slate-202 dark:border-zinc-808/80 focus:border-indigo-505 rounded-2xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder-slate-400 dark:placeholder-zinc-705 transition-all duration-200 shadow-inner"
                      placeholder="admin@yourdomain.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-555 dark:text-zinc-400 uppercase tracking-wider mb-2">Report Time (HH:MM)</label>
                    <input
                      value={smtp.cronReportTime || "09:00"}
                      onChange={e => setSmtp(s => ({ ...s, cronReportTime: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950/60 border border-slate-202 dark:border-zinc-800/80 focus:border-indigo-550/80 rounded-2xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder-zinc-700 transition-all duration-200 shadow-inner"
                      placeholder="09:00"
                    />
                  </div>
                  <div className="flex items-end pb-3">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div
                        onClick={() => setSmtp(s => ({ ...s, cronReportEnabled: !s.cronReportEnabled }))}
                        className={`w-12 h-6 rounded-full transition-all duration-300 flex items-center p-0.5 cursor-pointer ${
                          smtp.cronReportEnabled ? "bg-indigo-650 shadow-[0_0_12px_rgba(99,102,241,0.4)]" : "bg-slate-205 border border-slate-300 dark:bg-zinc-800 dark:border-zinc-700"
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-md ${smtp.cronReportEnabled ? "translate-x-6" : "translate-x-0.5"}`} />
                      </div>
                      <span className="text-xs font-bold text-slate-555 dark:text-zinc-400 group-hover:text-slate-800 dark:group-hover:text-zinc-200 transition-colors uppercase tracking-wider">Enable Daily Report</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-200 dark:border-zinc-800/80">
                <button
                  type="button"
                  onClick={handleSmtpTest}
                  disabled={smtpTesting}
                  className="flex items-center justify-center gap-2.5 px-6 py-3.5 border border-slate-200 dark:border-zinc-805 hover:border-slate-300 dark:hover:border-zinc-700 text-slate-600 dark:text-zinc-300 bg-slate-55/20 dark:bg-zinc-950/20 hover:bg-slate-100 dark:hover:bg-zinc-800/40 rounded-2xl text-sm font-bold disabled:opacity-50 transition-all duration-200 active:scale-95 shadow-sm"
                >
                  {smtpTesting ? (
                    <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send size={14} className="text-slate-400 dark:text-zinc-555" />
                  )}
                  Test Connection
                </button>
                <button
                  type="submit"
                  disabled={smtpSaving}
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl transition-all duration-200 text-sm shadow-md dark:shadow-[0_4px_15px_rgba(99,102,241,0.2)] active:scale-95 flex items-center justify-center gap-2"
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
              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-white dark:via-zinc-200 dark:to-zinc-400 tracking-tight">Registered Users</h1>
              <p className="text-slate-555 dark:text-zinc-400 text-sm mt-1">Full control over subscriber accounts and active organization licenses</p>
            </div>

            {/* Stats Row */}
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Total Subscribers", value: stats.total, color: "text-slate-900 dark:text-white bg-white dark:bg-zinc-900/40 border-slate-202 dark:border-zinc-800/40" },
                  { label: "Verified Licenses", value: stats.verifiedCount, color: "text-emerald-600 dark:text-emerald-450 bg-white dark:bg-zinc-900/40 border-slate-202 dark:border-zinc-800/40 shadow-[0_4px_20px_rgba(16,185,129,0.03)] dark:shadow-[0_4px_20px_rgba(16,185,129,0.05)]" },
                  { label: "Unverified Requests", value: stats.unverifiedCount, color: "text-amber-605 dark:text-amber-400 bg-white dark:bg-zinc-900/40 border-slate-202 dark:border-zinc-800/40" },
                  { label: "Registered This Week", value: stats.weekCount, color: "text-indigo-655 dark:text-indigo-400 bg-white dark:bg-zinc-900/40 border-slate-202 dark:border-zinc-800/40" },
                ].map(s => (
                  <div key={s.label} className={`border backdrop-blur-md rounded-2xl p-5 text-center shadow-md dark:shadow-lg ${s.color}`}>
                    <p className="text-3xl font-black tracking-tight">{s.value}</p>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-550 font-bold uppercase tracking-wider mt-1.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Filters and Search */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/80 dark:bg-zinc-900/20 border border-slate-200 dark:border-zinc-800/50 p-4 rounded-3xl backdrop-blur-md shadow-sm">
              <div className="relative w-full md:max-w-sm">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-555" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search by name, organization or email..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-950/60 border border-slate-205 dark:border-zinc-800/80 rounded-2xl text-slate-905 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-slate-400 dark:placeholder-zinc-550 transition-all shadow-inner"
                />
              </div>
              <div className="flex gap-1 bg-slate-105 dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-800/60 rounded-2xl p-1 w-full md:w-auto overflow-x-auto shrink-0">
                {["all", "verified", "unverified"].map(f => (
                  <button
                    key={f}
                    onClick={() => setUserFilter(f)}
                    className={`px-4 py-2 text-xs font-bold rounded-xl capitalize transition-all duration-205 shrink-0 ${
                      userFilter === f
                        ? "bg-indigo-650 dark:bg-indigo-600 text-white shadow-md shadow-indigo-600/15"
                        : "text-slate-555 dark:text-zinc-400 hover:text-slate-805 dark:hover:text-zinc-100"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800/80 rounded-3xl overflow-hidden backdrop-blur-md shadow-md dark:shadow-xl transition-colors duration-300">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-zinc-950/40 border-b border-slate-200 dark:border-zinc-800/60">
                    <tr>
                      {["User Details", "Organization", "Active Plan", "License Status", "Subscription End Date", "Actions"].map(h => (
                        <th key={h} className="text-left px-6 py-4.5 text-xs font-bold text-slate-555 dark:text-zinc-400 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 dark:text-zinc-550 font-semibold">
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
                        <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-colors duration-200">
                          {/* Name & Details */}
                          <td className="px-6 py-4.5 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500/10 to-purple-500/5 dark:from-indigo-500/20 dark:to-purple-500/10 border border-indigo-100 dark:border-indigo-500/25 flex items-center justify-center text-sm font-bold text-indigo-655 dark:text-indigo-305 shadow-sm">
                                {user.name[0].toUpperCase()}
                              </div>
                              <div>
                                <span className="text-slate-900 dark:text-white font-semibold block text-sm">{user.name}</span>
                                <span className="text-slate-555 dark:text-zinc-555 text-xs">{user.email}</span>
                              </div>
                            </div>
                          </td>

                          {/* Organization */}
                          <td className="px-6 py-4.5 whitespace-nowrap">
                            {org ? (
                              <div>
                                <p className="text-slate-705 dark:text-zinc-200 text-xs font-semibold bg-slate-50 dark:bg-zinc-950/20 border border-slate-202 dark:border-zinc-805/40 rounded-lg px-2.5 py-1 inline-block">{org.name}</p>
                                <p className="text-slate-500 dark:text-zinc-500 text-[10px] uppercase font-bold tracking-wider mt-1 ml-0.5">{role || "MEMBER"}</p>
                              </div>
                            ) : (
                              <span className="text-slate-400 dark:text-zinc-655 font-mono text-xs">—</span>
                            )}
                          </td>

                          {/* Plan Badge */}
                          <td className="px-6 py-4.5 whitespace-nowrap">
                            {org ? (
                              org.planType === "FREE_TRIAL" ? (
                                <span className="inline-flex items-center gap-1.5 text-xs bg-violet-500/10 text-violet-655 dark:text-violet-400 border border-violet-100 dark:border-violet-500/25 px-3 py-1.5 rounded-full font-bold whitespace-nowrap shrink-0 shadow-[0_2px_10px_rgba(139,92,246,0.03)] dark:shadow-[0_2px_10px_rgba(139,92,246,0.05)]">
                                  ⏳ 7-Days Free Trial
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-xs bg-amber-500/10 text-amber-705 dark:text-amber-405 border border-amber-100 dark:border-amber-500/25 px-3 py-1.5 rounded-full font-extrabold whitespace-nowrap shrink-0 shadow-[0_2px_12px_rgba(245,158,11,0.05)] dark:shadow-[0_2px_12px_rgba(245,158,11,0.08)]">
                                  👑 Enterprise Paid
                                </span>
                              )
                            ) : (
                              <span className="text-slate-400 dark:text-zinc-655 font-mono text-xs">—</span>
                            )}
                          </td>

                          {/* License Status Badge */}
                          <td className="px-6 py-4.5 whitespace-nowrap">
                            {org ? (
                              org.status === "ACTIVE" ? (
                                <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 dark:bg-emerald-500/10 text-emerald-655 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 px-3 py-1 rounded-full font-semibold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-xs bg-rose-50 dark:bg-rose-500/10 text-rose-655 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20 px-3 py-1 rounded-full font-semibold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400 animate-pulse" />
                                  Blocked
                                </span>
                              )
                            ) : (
                              <span className="text-slate-400 dark:text-zinc-655 font-mono text-xs">—</span>
                            )}
                          </td>

                          {/* Subscription Expiration End Date */}
                          <td className="px-6 py-4.5 whitespace-nowrap">
                            {org ? (
                              org.subscriptionEndDate ? (
                                isExpired ? (
                                  <div>
                                    <p className="text-rose-605 dark:text-rose-400 text-xs font-bold flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                                      Expired
                                    </p>
                                    <p className="text-slate-500 dark:text-zinc-550 text-[10px] mt-0.5">{Math.abs(daysLeft || 0)} days ago</p>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                                      {daysLeft} days left
                                    </p>
                                    <p className="text-slate-500 dark:text-zinc-550 text-[10px] mt-0.5">{new Date(org.subscriptionEndDate).toLocaleDateString("en-IN")}</p>
                                  </div>
                                )
                              ) : (
                                <span className="text-xs bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800/80 text-slate-500 dark:text-zinc-400 px-3 py-1.5 rounded-xl font-medium">Unlimited</span>
                              )
                            ) : (
                              <span className="text-slate-400 dark:text-zinc-600 font-mono text-xs">—</span>
                            )}
                          </td>

                          {/* Interactive Action Buttons */}
                          <td className="px-6 py-4.5 whitespace-nowrap">
                            {org ? (
                              <div className="flex items-center gap-2 text-xs">
                                {/* Toggle Block state */}
                                {org.status === "ACTIVE" ? (
                                  <button
                                    onClick={() => handleOrgAction(org.id, "block")}
                                    disabled={submittingOrgId === org.id}
                                    className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-500/5 hover:bg-rose-100 dark:hover:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 hover:border-rose-450 dark:hover:border-rose-500/40 text-rose-600 dark:text-rose-400 rounded-xl transition-all duration-200 font-bold disabled:opacity-50 hover:scale-105"
                                  >
                                    Block
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleOrgAction(org.id, "unblock")}
                                    disabled={submittingOrgId === org.id}
                                    className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-500/5 hover:bg-emerald-100 dark:hover:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 hover:border-emerald-450 dark:hover:border-emerald-500/40 text-emerald-600 dark:text-emerald-405 rounded-xl transition-all duration-200 font-bold disabled:opacity-50 hover:scale-105"
                                  >
                                    Unblock
                                  </button>
                                )}

                                {/* Upgrade/Downgrade Plan Type */}
                                {org.planType === "FREE_TRIAL" ? (
                                  <button
                                    onClick={() => handleOrgAction(org.id, "changePlan", { planType: "ACTIVE_PAID" })}
                                    disabled={submittingOrgId === org.id}
                                    className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-500/5 hover:bg-amber-100 dark:hover:bg-amber-500/10 border border-amber-205 dark:border-amber-500/25 hover:border-amber-450 dark:hover:border-amber-500/40 text-amber-705 dark:text-amber-405 rounded-xl transition-all duration-200 font-extrabold disabled:opacity-50 hover:scale-105"
                                  >
                                    Activate
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleOrgAction(org.id, "changePlan", { planType: "FREE_TRIAL" })}
                                    disabled={submittingOrgId === org.id}
                                    className="px-2.5 py-1.5 bg-slate-105 dark:bg-zinc-800/30 hover:bg-slate-200 dark:hover:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/40 text-slate-655 dark:text-zinc-300 rounded-xl transition-all duration-200 font-semibold disabled:opacity-50 hover:scale-105"
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
                                  className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-500/5 hover:bg-indigo-100 dark:hover:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/25 hover:border-indigo-455 dark:hover:border-indigo-500/45 text-indigo-650 dark:text-indigo-400 rounded-xl transition-all duration-200 font-bold hover:scale-105"
                                >
                                  Extend
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 dark:text-zinc-650 font-mono text-xs">—</span>
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

        {/* ========== ORGANIZATIONS TAB ========== */}
        {activeTab === "organizations" && (
          <div className="space-y-8 animate-fade-in">
            <div>
              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-white dark:via-zinc-200 dark:to-zinc-400 tracking-tight">Organizations</h1>
              <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">Manage tenant organizations, licenses, limits, and member lists</p>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/80 dark:bg-zinc-900/20 border border-slate-200 dark:border-zinc-800/50 p-4 rounded-3xl backdrop-blur-md shadow-sm">
              <div className="relative w-full md:max-w-sm">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-405 dark:text-zinc-550" />
                <input
                  type="text"
                  value={orgSearch}
                  onChange={e => setOrgSearch(e.target.value)}
                  placeholder="Search by company name or slug..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-950/60 border border-slate-205 dark:border-zinc-800/80 rounded-2xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-slate-400 dark:placeholder-zinc-500 transition-all shadow-inner"
                />
              </div>
              <div className="flex gap-1 bg-slate-105 dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-800/60 rounded-2xl p-1 w-full md:w-auto overflow-x-auto shrink-0">
                {["all", "active", "blocked"].map(f => (
                  <button
                    key={f}
                    onClick={() => setOrgFilter(f)}
                    className={`px-4 py-2 text-xs font-bold rounded-xl capitalize transition-all duration-200 shrink-0 ${
                      orgFilter === f
                        ? "bg-indigo-655 dark:bg-indigo-600 text-white shadow-md shadow-indigo-600/15"
                        : "text-slate-555 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-100"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Organizations Table */}
            <div className="bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800/80 rounded-3xl overflow-hidden backdrop-blur-md shadow-md dark:shadow-xl transition-colors duration-300">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-zinc-950/40 border-b border-slate-200 dark:border-zinc-800/60">
                    <tr>
                      {["Organization Details", "Members", "Active Plan", "License Status", "Subscription End Date", "Actions"].map(h => (
                        <th key={h} className="text-left px-6 py-4.5 text-xs font-bold text-slate-555 dark:text-zinc-400 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
                    {orgsLoading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 dark:text-zinc-550 font-semibold animate-pulse">
                          Loading organizations...
                        </td>
                      </tr>
                    ) : organizations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-405 dark:text-zinc-555 font-semibold">
                          No tenant organizations found
                        </td>
                      </tr>
                    ) : organizations.map(org => {
                      let daysLeft: number | null = null;
                      let isExpired = false;
                      if (org.subscriptionEndDate) {
                        const end = new Date(org.subscriptionEndDate);
                        const diffTime = end.getTime() - Date.now();
                        daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        isExpired = daysLeft < 0;
                      }

                      // Pastel background colors for avatar stacks
                      const colors = [
                        "bg-red-500/10 text-red-655 dark:bg-red-500/20 dark:text-red-300",
                        "bg-blue-500/10 text-blue-655 dark:bg-blue-500/20 dark:text-blue-300",
                        "bg-green-500/10 text-green-655 dark:bg-green-500/20 dark:text-green-300",
                        "bg-amber-500/10 text-amber-655 dark:bg-amber-500/20 dark:text-amber-300",
                        "bg-purple-500/10 text-purple-655 dark:bg-purple-500/20 dark:text-purple-300",
                      ];

                      return (
                        <tr key={org.id} onClick={() => { setSelectedOrg(org); setOrgMemberSearch(""); }} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-colors duration-200 cursor-pointer">
                          {/* Organization Name & Slug */}
                          <td className="px-6 py-4.5 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500/10 to-purple-500/5 dark:from-indigo-500/20 dark:to-purple-500/10 border border-indigo-100 dark:border-indigo-500/25 flex items-center justify-center text-indigo-655 dark:text-indigo-305 shadow-sm">
                                <Building2 size={16} />
                              </div>
                              <div>
                                <span className="text-slate-900 dark:text-white font-semibold block text-sm">{org.name}</span>
                                <span className="text-slate-555 dark:text-zinc-450 text-xs font-mono">/{org.slug}</span>
                              </div>
                            </div>
                          </td>

                          {/* Member avatars list & badge */}
                          <td className="px-6 py-4.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {org.members && org.members.length > 0 ? (
                                <div className="flex -space-x-2.5 overflow-hidden animate-fade-in">
                                  {org.members.slice(0, 3).map((m, idx) => {
                                    const initial = m.user.name ? m.user.name[0].toUpperCase() : "U";
                                    return (
                                      <div
                                        key={m.id}
                                        title={m.user.name}
                                        className={`w-7 h-7 rounded-full border border-white dark:border-zinc-900 flex items-center justify-center text-[10px] font-bold ${colors[idx % colors.length]} shadow-sm shrink-0`}
                                      >
                                        {initial}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : null}
                              <span className="text-xs bg-slate-50 dark:bg-zinc-950/30 border border-slate-200 dark:border-zinc-805/50 rounded-lg px-2.5 py-1 text-slate-600 dark:text-zinc-300 font-bold flex items-center gap-1">
                                👥 {org._count.members} {org._count.members === 1 ? "Member" : "Members"}
                              </span>
                            </div>
                          </td>

                          {/* Plan Badge */}
                          <td className="px-6 py-4.5 whitespace-nowrap">
                            {org.planType === "FREE_TRIAL" ? (
                              <span className="inline-flex items-center gap-1.5 text-xs bg-violet-500/10 text-violet-655 dark:text-violet-450 border border-violet-100 dark:border-violet-500/25 px-3 py-1.5 rounded-full font-bold whitespace-nowrap shrink-0 shadow-[0_2px_10px_rgba(139,92,246,0.03)] dark:shadow-[0_2px_10px_rgba(139,92,246,0.05)]">
                                ⏳ 7-Days Free Trial
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs bg-amber-500/10 text-amber-705 dark:text-amber-400 border border-amber-100 dark:border-amber-500/25 px-3 py-1.5 rounded-full font-extrabold whitespace-nowrap shrink-0 shadow-[0_2px_12px_rgba(245,158,11,0.05)] dark:shadow-[0_2px_12px_rgba(245,158,11,0.08)]">
                                👑 Enterprise Paid
                              </span>
                            )}
                          </td>

                          {/* License Status */}
                          <td className="px-6 py-4.5 whitespace-nowrap">
                            {org.status === "ACTIVE" ? (
                              <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 dark:bg-emerald-500/10 text-emerald-655 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 px-3 py-1 rounded-full font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs bg-rose-50 dark:bg-rose-500/10 text-rose-655 dark:text-rose-455 border border-rose-100 dark:border-rose-500/20 px-3 py-1 rounded-full font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400 animate-pulse" />
                                Blocked
                              </span>
                            )}
                          </td>

                          {/* Expiration status */}
                          <td className="px-6 py-4.5 whitespace-nowrap">
                            {org.subscriptionEndDate ? (
                              isExpired ? (
                                <div>
                                  <p className="text-rose-605 dark:text-rose-405 text-xs font-bold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                                    Expired
                                  </p>
                                  <p className="text-slate-500 dark:text-zinc-550 text-[10px] mt-0.5">{Math.abs(daysLeft || 0)} days ago</p>
                                </div>
                              ) : (
                                <div>
                                  <p className="text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-505 dark:bg-emerald-400 animate-pulse" />
                                    {daysLeft} days left
                                  </p>
                                  <p className="text-slate-505 dark:text-zinc-555 text-[10px] mt-0.5">{new Date(org.subscriptionEndDate).toLocaleDateString("en-IN")}</p>
                                </div>
                              )
                            ) : (
                              <span className="text-xs bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800/80 text-slate-500 dark:text-zinc-400 px-3 py-1.5 rounded-xl font-medium">Unlimited</span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="px-6 py-4.5 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-2 text-xs">
                              {/* Toggle block/unblock */}
                              {org.status === "ACTIVE" ? (
                                <button
                                  onClick={() => triggerConfirm(org, "block")}
                                  disabled={submittingOrgId === org.id}
                                  className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-500/5 hover:bg-rose-100 dark:hover:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-450 rounded-xl transition-all duration-200 font-bold disabled:opacity-50 hover:scale-105"
                                >
                                  Block
                                </button>
                              ) : (
                                <button
                                  onClick={() => triggerConfirm(org, "unblock")}
                                  disabled={submittingOrgId === org.id}
                                  className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-500/5 hover:bg-emerald-100 dark:hover:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-405 rounded-xl transition-all duration-200 font-bold disabled:opacity-50 hover:scale-105"
                                >
                                  Unblock
                                </button>
                              )}

                              {/* Activate / Downgrade */}
                              {org.planType === "FREE_TRIAL" ? (
                                <button
                                  onClick={() => triggerConfirm(org, "changePlan", { planType: "ACTIVE_PAID" })}
                                  disabled={submittingOrgId === org.id}
                                  className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-500/5 hover:bg-amber-100 dark:hover:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 text-amber-700 dark:text-amber-400 rounded-xl transition-all duration-200 font-extrabold disabled:opacity-50 hover:scale-105"
                                >
                                  Activate
                                </button>
                              ) : (
                                <button
                                  onClick={() => triggerConfirm(org, "changePlan", { planType: "FREE_TRIAL" })}
                                  disabled={submittingOrgId === org.id}
                                  className="px-2.5 py-1.5 bg-slate-100 dark:bg-zinc-800/30 hover:bg-slate-200 dark:hover:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/40 text-slate-600 dark:text-zinc-300 rounded-xl transition-all duration-200 font-semibold disabled:opacity-50 hover:scale-105"
                                >
                                  Downgrade
                                </button>
                              )}

                              {/* Extend */}
                              <button
                                onClick={() => {
                                  setExtendModalOrg({ id: org.id, name: org.name, endDate: org.subscriptionEndDate });
                                  setCustomDays(30);
                                }}
                                className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-500/5 hover:bg-indigo-100 dark:hover:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/25 text-indigo-650 dark:text-indigo-400 rounded-xl transition-all duration-200 font-bold hover:scale-105"
                              >
                                Extend
                              </button>
                            </div>
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
              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-805 to-slate-700 dark:from-white dark:via-zinc-200 dark:to-zinc-400 tracking-tight">Cron Jobs</h1>
              <p className="text-slate-555 dark:text-zinc-400 text-sm mt-1">Automated background tasks. Trigger manually for testing or run logs generation.</p>
            </div>

            {cronMsg && (
              <div className={`px-5 py-4 rounded-2xl text-sm font-semibold flex items-center gap-3 backdrop-blur-md transition-all duration-305 border ${
                cronMsg.startsWith("✅")
                  ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-50 dark:bg-rose-500/10 border-rose-205 dark:border-rose-500/20 text-rose-600 dark:text-rose-400"
              }`}>
                <span className="text-base">{cronMsg.startsWith("✅") ? "✨" : "⚠️"}</span>
                <span>{cronMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6">
              {cronJobs.map(job => (
                <div key={job.action} className="group relative bg-white dark:bg-zinc-900/40 border border-slate-205 dark:border-zinc-800/80 rounded-3xl p-6 backdrop-blur-md transition-all duration-300 hover:border-slate-350 dark:hover:border-zinc-700/60 shadow-md dark:shadow-lg">
                  <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/10 transition-all duration-300" />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20 text-indigo-655 dark:text-indigo-400">
                          <Clock size={15} className="animate-pulse" />
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-wide">{job.name}</h3>
                      </div>
                      <p className="text-slate-500 dark:text-zinc-400 text-sm leading-relaxed max-w-xl">{job.description}</p>
                      <div className="flex items-center gap-4 pt-1">
                        <span className="text-xs font-mono bg-slate-50 dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-800/50 text-indigo-650 dark:text-indigo-400 px-3 py-1.5 rounded-xl shadow-inner font-semibold">
                          🕒 Schedule: <span className="text-slate-700 dark:text-zinc-300 font-bold">{job.schedule}</span>
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
                  <span className="text-xs text-zinc-505 font-mono ml-2">license-scheduler-setup.sh</span>
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

      {/* ── Organization Members Modal ── */}
      {selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-zinc-950/70 backdrop-blur-xl p-4 animate-fade-in" onClick={() => setSelectedOrg(null)}>
          <div className="relative bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800/80 rounded-3xl p-6 max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[88vh]" onClick={e => e.stopPropagation()}>

            {/* Glow */}
            <div className="absolute -top-16 -left-16 w-36 h-36 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none" />

            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500/10 to-purple-500/5 dark:from-indigo-500/20 dark:to-purple-500/10 border border-indigo-100 dark:border-indigo-500/25 flex items-center justify-center">
                  <Building2 size={18} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{selectedOrg.name}</h3>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">/{selectedOrg.slug}</p>
                </div>
              </div>
              <button onClick={() => setSelectedOrg(null)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-100 transition-colors text-sm font-bold">✕</button>
            </div>

            {/* Org Info Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <div className="bg-slate-50 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800/60 rounded-xl px-3 py-2">
                <p className="text-[9px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Plan</p>
                {selectedOrg.planType === "FREE_TRIAL" ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-violet-600 dark:text-violet-400 font-bold mt-0.5">⏳ Free Trial</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">👑 Enterprise</span>
                )}
              </div>
              <div className="bg-slate-50 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800/60 rounded-xl px-3 py-2">
                <p className="text-[9px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Status</p>
                {selectedOrg.status === "ACTIVE" ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Active</span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-0.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />Blocked</span>
                )}
              </div>
              <div className="bg-slate-50 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800/60 rounded-xl px-3 py-2">
                <p className="text-[9px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Start Date</p>
                <p className="text-[10px] text-slate-700 dark:text-zinc-300 font-bold mt-0.5">{new Date(selectedOrg.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
              </div>
              <div className="bg-slate-50 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800/60 rounded-xl px-3 py-2">
                <p className="text-[9px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">End Date</p>
                <p className="text-[10px] font-bold mt-0.5">
                  {selectedOrg.subscriptionEndDate ? (
                    <span className={new Date(selectedOrg.subscriptionEndDate) < new Date() ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
                      {new Date(selectedOrg.subscriptionEndDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  ) : (
                    <span className="text-slate-500 dark:text-zinc-400">Unlimited</span>
                  )}
                </p>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: "Members", value: selectedOrg._count?.members || 0, color: "text-indigo-600 dark:text-indigo-400" },
                { label: "Active SIMs", value: selectedOrg._count?.registeredSIMs || 0, color: "text-emerald-600 dark:text-emerald-400" },
                { label: "Synced Logs", value: selectedOrg._count?.callLogs || 0, color: "text-amber-600 dark:text-amber-400" },
              ].map(s => (
                <div key={s.label} className="bg-slate-50 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800/60 rounded-xl p-3 text-center">
                  <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-[9px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Members Section */}
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-700 dark:text-zinc-200 uppercase tracking-wider">Members ({selectedOrg.members?.length || 0})</p>
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <input
                  type="text"
                  value={orgMemberSearch}
                  onChange={e => setOrgMemberSearch(e.target.value)}
                  placeholder="Search member..."
                  className="pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800/80 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-slate-400 dark:placeholder-zinc-600 w-44 shadow-inner"
                />
              </div>
            </div>

            {/* Members List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-[120px] pr-1">
              {(selectedOrg.members?.filter(m =>
                m.user.name.toLowerCase().includes(orgMemberSearch.toLowerCase()) ||
                m.user.email.toLowerCase().includes(orgMemberSearch.toLowerCase())
              ) ?? []).length === 0 ? (
                <p className="text-center py-8 text-slate-400 dark:text-zinc-600 text-xs font-semibold">No members found.</p>
              ) : (
                selectedOrg.members?.filter(m =>
                  m.user.name.toLowerCase().includes(orgMemberSearch.toLowerCase()) ||
                  m.user.email.toLowerCase().includes(orgMemberSearch.toLowerCase())
                ).map(member => {
                  const roleBadge: Record<string, string> = {
                    OWNER: "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30",
                    ADMIN: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30",
                    MEMBER: "bg-slate-50 dark:bg-zinc-800/30 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700/50",
                  };
                  return (
                    <div key={member.id} className="flex items-center justify-between bg-slate-50/60 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-800/40 rounded-xl px-3 py-2.5 hover:bg-slate-100/60 dark:hover:bg-zinc-800/30 transition-all">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500/10 to-purple-500/5 dark:from-indigo-500/20 dark:to-purple-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {member.user.name ? member.user.name[0].toUpperCase() : "U"}
                        </div>
                        <div>
                          <p className="text-slate-900 dark:text-white font-semibold text-xs">{member.user.name}</p>
                          <p className="text-slate-500 dark:text-zinc-500 text-[10px]">{member.user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-right shrink-0">
                        <div className="text-right">
                          <p className="text-[9px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-bold">Start</p>
                          <p className="text-[10px] text-slate-700 dark:text-zinc-300 font-semibold">{new Date(member.joinedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-bold">End</p>
                          <p className="text-[10px] font-semibold">
                            {selectedOrg.subscriptionEndDate
                              ? <span className={new Date(selectedOrg.subscriptionEndDate) < new Date() ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"}>{new Date(selectedOrg.subscriptionEndDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                              : <span className="text-slate-400 dark:text-zinc-500">∞</span>
                            }
                          </p>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-1 rounded-lg border uppercase tracking-wider ${roleBadge[member.role] || roleBadge.MEMBER}`}>{member.role}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Administrative Actions Footer */}
            <div className="pt-4 mt-2 border-t border-slate-200 dark:border-zinc-800/80">
              <p className="text-[9px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider mb-2">Administrative Commands</p>
              <div className="flex flex-wrap gap-2">
                {selectedOrg.status === "ACTIVE" ? (
                  <button onClick={() => triggerConfirm(selectedOrg, "block")} disabled={submittingOrgId === selectedOrg.id}
                    className="px-3 py-1.5 bg-rose-50 dark:bg-rose-500/5 hover:bg-rose-100 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition-all disabled:opacity-50 hover:scale-105">
                    🔒 Block Organization
                  </button>
                ) : (
                  <button onClick={() => triggerConfirm(selectedOrg, "unblock")} disabled={submittingOrgId === selectedOrg.id}
                    className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/5 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold transition-all disabled:opacity-50 hover:scale-105">
                    ✅ Restore Access
                  </button>
                )}
                {selectedOrg.planType === "FREE_TRIAL" ? (
                  <button onClick={() => triggerConfirm(selectedOrg, "changePlan", { planType: "ACTIVE_PAID" })} disabled={submittingOrgId === selectedOrg.id}
                    className="px-3 py-1.5 bg-amber-50 dark:bg-amber-500/5 hover:bg-amber-100 border border-amber-200 dark:border-amber-500/25 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-extrabold transition-all disabled:opacity-50 hover:scale-105">
                    👑 Activate Enterprise
                  </button>
                ) : (
                  <button onClick={() => triggerConfirm(selectedOrg, "changePlan", { planType: "FREE_TRIAL" })} disabled={submittingOrgId === selectedOrg.id}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800/30 hover:bg-slate-200 border border-slate-200 dark:border-zinc-700/40 text-slate-600 dark:text-zinc-300 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 hover:scale-105">
                    ⬇️ Downgrade to Trial
                  </button>
                )}
                <button onClick={() => { setExtendModalOrg({ id: selectedOrg.id, name: selectedOrg.name, endDate: selectedOrg.subscriptionEndDate }); setCustomDays(30); }}
                  className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/5 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-500/25 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold transition-all hover:scale-105">
                  ⏰ Extend Period
                </button>
                <button onClick={() => setSelectedOrg(null)}
                  className="ml-auto px-3 py-1.5 bg-slate-50 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 rounded-xl text-xs font-bold transition-all hover:bg-slate-100 dark:hover:bg-zinc-800/30">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmation Dialog ── */}
      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 dark:bg-zinc-950/80 backdrop-blur-xl p-4 animate-fade-in">
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-5 overflow-hidden">
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-indigo-500/10 rounded-full blur-[50px] pointer-events-none" />
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-2xl shrink-0">
                {confirmAction.icon}
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">{confirmAction.title}</h3>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono mt-0.5">{confirmAction.orgName}</p>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800/60 rounded-2xl p-4">
              <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">{confirmAction.message}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-xl px-4 py-2.5 flex items-start gap-2">
              <span className="text-amber-500 text-sm mt-0.5">⚠️</span>
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Please verify all details before confirming. This action will take effect immediately.</p>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 py-3 bg-slate-50 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800/40 text-slate-600 dark:text-zinc-400 rounded-2xl text-sm font-bold transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={() => handleOrgAction(confirmAction.orgId, confirmAction.action, confirmAction.payload)}
                disabled={submittingOrgId === confirmAction.orgId}
                className={`flex-1 py-3 rounded-2xl text-sm font-extrabold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md ${confirmAction.confirmClass}`}
              >
                {submittingOrgId === confirmAction.orgId ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Processing...</>
                ) : (
                  confirmAction.confirmLabel
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Extend Period Modal ── */}
      {extendModalOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-zinc-950/70 backdrop-blur-xl p-4 animate-fade-in">
          <div className="relative bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800/80 rounded-3xl p-8 max-w-md w-full space-y-6 shadow-2xl overflow-hidden">
            
            {/* Subtle glow effect behind modal */}
            <div className="absolute -top-16 -left-16 w-36 h-36 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none" />

            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>⏱️</span> Extend Subscription Period
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2 bg-slate-50 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800/60 px-3 py-2 rounded-xl inline-block font-semibold">
                Company: <span className="text-indigo-650 dark:text-indigo-400 font-bold">{extendModalOrg.name}</span>
              </p>
              {extendModalOrg.endDate && (
                <p className="text-xs text-slate-555 dark:text-zinc-555 mt-2 flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-650" />
                  Current Expiration Date: <span className="text-slate-705 dark:text-zinc-300 font-bold">{new Date(extendModalOrg.endDate).toLocaleDateString("en-IN")}</span>
                </p>
              )}
            </div>

            <div className="space-y-3.5">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider">Duration (Select Number of Days)</label>
              
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
                        : "bg-slate-50 dark:bg-zinc-950/40 border-slate-205 dark:border-zinc-800/80 text-slate-550 dark:text-zinc-450 hover:text-slate-805 dark:hover:text-zinc-100 hover:border-slate-350 dark:hover:border-zinc-700"
                    }`}
                  >
                    +{d} Days
                  </button>
                ))}
                
                {/* Custom days manual input */}
                <div className="relative">
                  <input
                    type="number"
                    value={customDays}
                    onChange={e => setCustomDays(parseInt(e.target.value) || 0)}
                    placeholder="Custom"
                    className="w-full px-2.5 py-2.5 bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800/80 rounded-xl text-slate-905 dark:text-white text-center text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-50 focus:border-transparent placeholder-slate-400 dark:placeholder-zinc-650"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={() => setExtendModalOrg(null)}
                className="flex-1 py-3 bg-slate-50 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800/30 text-slate-555 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded-2xl text-xs font-bold transition-all duration-200 active:scale-95"
              >
                Cancel
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
                    Extending...
                  </>
                ) : (
                  "Extend Period"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
