"use client";
// src/app/call-logs/page.tsx

import { useEffect, useState, useCallback } from "react";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneOff, Star, StickyNote, Plus, Upload, Search, ArrowDownLeft, ArrowUpRight, User, Users, Calendar, Clock, Smartphone, Tag } from "lucide-react";
import Link from "next/link";
import { formatDateTime, formatDuration, getCallTypeColor, cn } from "@/lib/utils";

interface CallLog {
  id: string;
  mobileNumber: string;
  contactName: string | null;
  callType: string;
  date: string;
  duration: number;
  simSlot: string;
  deviceName: string | null;
  isImportant: boolean;
  tags: { tag: { id: string; name: string; color: string } }[];
  _count: { notes: number; tasks: number };
  importedBy?: { id: string; name: string; email: string } | null;
}

const CALL_TYPE_ICONS = {
  INCOMING: PhoneIncoming,
  OUTGOING: PhoneOutgoing,
  MISSED: PhoneMissed,
  REJECTED: PhoneOff,
};

export default function CallLogsPage() {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [callType, setCallType] = useState("ALL");
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState("ALL");
  const [simSlot, setSimSlot] = useState("ALL");
  const [exporting, setExporting] = useState(false);

  const orgId = typeof window !== "undefined" ? localStorage.getItem("currentOrgId") || "" : "";

  // Helper function to render colorful avatars based on contact name or number
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

  // Helper to render customized arrows and styled badges for call types
  const renderCallTypeBadge = (type: string) => {
    if (type === "INCOMING") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-600 bg-emerald-50/50 border border-emerald-100/80 shadow-sm">
          <ArrowDownLeft size={12} className="stroke-[2.5]" />
          Incoming
        </span>
      );
    }
    if (type === "OUTGOING") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-orange-600 bg-orange-50/50 border border-orange-100/80 shadow-sm">
          <ArrowUpRight size={12} className="stroke-[2.5]" />
          Outgoing
        </span>
      );
    }
    if (type === "MISSED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50/50 border border-rose-100/80 shadow-sm">
          <ArrowDownLeft size={12} className="stroke-[2.5] text-rose-500 animate-pulse" />
          Missed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-100 shadow-sm">
        <PhoneOff size={11} className="text-slate-400" />
        Rejected
      </span>
    );
  };

  // Friendly date formatting: MMM DD, YYYY · hh:mm am/pm
  const formatDateFriendly = (dateStr: string) => {
    const dateObj = new Date(dateStr);
    const formattedDate = dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    const formattedTime = dateObj.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }).toLowerCase();
    return `${formattedDate} · ${formattedTime}`;
  };

  // Load members on mount
  useEffect(() => {
    if (!orgId) return;
    fetch(`/api/v1/organizations/${orgId}/members`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setMembers(data.data);
        }
      })
      .catch((err) => console.error("Failed to load members", err));
  }, [orgId]);

  const fetchCalls = useCallback(async (reset = false) => {
    if (!orgId) return;
    setLoading(true);

    const params = new URLSearchParams({
      limit: "50",
      ...(search ? { search } : {}),
      ...(callType !== "ALL" ? { callType } : {}),
      ...(selectedUser !== "ALL" ? { userId: selectedUser } : {}),
      ...(simSlot !== "ALL" ? { simSlot } : {}),
      ...(!reset && cursor ? { cursor } : {}),
    });

    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/call-logs?${params}`);
      const data = await res.json();

      if (data.success) {
        if (reset) {
          setCalls(data.data.data);
        } else {
          setCalls((prev) => [...prev, ...data.data.data]);
        }
        setTotal(data.data.total);
        setCursor(data.data.nextCursor);
        setHasMore(data.data.hasMore);
      }
    } finally {
      setLoading(false);
    }
  }, [orgId, search, callType, selectedUser, simSlot, cursor]);

  useEffect(() => {
    setCursor(null);
    fetchCalls(true);
  }, [search, callType, selectedUser, simSlot]);

  async function toggleImportant(callId: string, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/v1/organizations/${orgId}/call-logs/${callId}/important`, { method: "PATCH" });
    fetchCalls(true);
  }

  async function exportCSV() {
    if (!orgId) return;
    setExporting(true);
    try {
      const params = new URLSearchParams({
        limit: "5000",
        ...(search ? { search } : {}),
        ...(callType !== "ALL" ? { callType } : {}),
        ...(selectedUser !== "ALL" ? { userId: selectedUser } : {}),
        ...(simSlot !== "ALL" ? { simSlot } : {}),
      });
      const res = await fetch(`/api/v1/organizations/${orgId}/call-logs?${params}`);
      const data = await res.json();
      if (data.success && data.data.data.length > 0) {
        const records = data.data.data;
        const headers = ["Contact Name", "Mobile Number", "Call Type", "Date & Time", "Duration (sec)", "SIM Slot", "Device Name", "Synced By"].join(",");
        const rows = records.map((call: any) => [
          `"${call.contactName || ""}"`,
          `"${call.mobileNumber}"`,
          `"${call.callType}"`,
          `"${new Date(call.date).toLocaleString("en-IN")}"`,
          call.duration,
          `"${call.simSlot}"`,
          `"${call.deviceName || ""}"`,
          `"${call.importedBy?.name || "System"}"`
        ].join(",")).join("\n");
        const csv = `${headers}\n${rows}`;
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `call_logs_export_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
      } else {
        alert("No call logs to export under current filters.");
      }
    } catch (err) {
      console.error("Export failed", err);
      alert("Failed to export call logs.");
    } finally {
      setExporting(false);
    }
  }

  const FILTER_TABS = [
    { value: "ALL", label: "All" },
    { value: "INCOMING", label: "Incoming" },
    { value: "OUTGOING", label: "Outgoing" },
    { value: "MISSED", label: "Missed" },
    { value: "REJECTED", label: "Rejected" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Phone size={20} className="text-indigo-600 stroke-[2.5]" />
            <span>Call History</span>
            <span className="text-xs font-normal text-slate-500 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-full">
              {total.toLocaleString()} Records
            </span>
          </h1>
          <p className="text-xs text-gray-400 font-medium mt-0.5">Real-time synchronized logs from all connected devices</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <Upload size={14} className="rotate-180 text-slate-500 stroke-[2.5]" />
            <span>{exporting ? "Exporting..." : "Export"}</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gradient-to-r from-white to-slate-50/50 rounded-2xl border border-slate-200/80 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search number, name, notes..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>

          {/* Employee Filter */}
          <div className="relative min-w-[150px]">
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white cursor-pointer font-medium text-slate-700"
            >
              <option value="ALL">All Members</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.name} ({m.role.toLowerCase()})
                </option>
              ))}
            </select>
          </div>

          {/* SIM Filter */}
          <div className="relative min-w-[150px]">
            <select
              value={simSlot}
              onChange={(e) => setSimSlot(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white cursor-pointer font-medium text-slate-700"
            >
              <option value="ALL">All SIM Slots</option>
              <option value="SIM_1">SIM 1</option>
              <option value="SIM_2">SIM 2</option>
              <option value="UNKNOWN">Unknown SIM</option>
            </select>
          </div>

          {/* Call type tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 shadow-inner border border-slate-200/40">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setCallType(tab.value)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
                  callType === tab.value
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gradient-to-br from-white/95 to-slate-50/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-100/40 p-1 overflow-hidden">
        <div className="overflow-x-auto rounded-xl">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-slate-100/80 to-slate-50/80 text-slate-600 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-200/80">
                <th className="text-left px-4 py-4 min-w-[220px]">
                  <span className="flex items-center gap-1.5"><User size={13} className="text-slate-400 stroke-[2]" /> Contact</span>
                </th>
                <th className="text-left px-4 py-4 min-w-[130px]">
                  <span className="flex items-center gap-1.5"><Phone size={13} className="text-slate-400 stroke-[2]" /> Type</span>
                </th>
                <th className="text-left px-4 py-4 min-w-[140px]">
                  <span className="flex items-center gap-1.5"><Users size={13} className="text-slate-400 stroke-[2]" /> Synced By</span>
                </th>
                <th className="text-left px-4 py-4 min-w-[180px]">
                  <span className="flex items-center gap-1.5"><Calendar size={13} className="text-slate-400 stroke-[2]" /> Date & Time</span>
                </th>
                <th className="text-left px-4 py-4 min-w-[110px]">
                  <span className="flex items-center gap-1.5"><Clock size={13} className="text-slate-400 stroke-[2]" /> Duration</span>
                </th>
                <th className="text-left px-4 py-4 min-w-[100px]">
                  <span className="flex items-center gap-1.5"><Smartphone size={13} className="text-slate-400 stroke-[2]" /> SIM</span>
                </th>
                <th className="text-left px-4 py-4 min-w-[120px]">
                  <span className="flex items-center gap-1.5"><Tag size={13} className="text-slate-400 stroke-[2]" /> Tags</span>
                </th>
                <th className="text-left px-4 py-4 min-w-[120px]">
                  <span className="flex items-center gap-1.5"><StickyNote size={13} className="text-slate-400 stroke-[2]" /> Notes</span>
                </th>
                <th className="px-4 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 bg-white/50">
              {loading && calls.length === 0 ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : calls.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-slate-400">
                    <Phone size={32} className="mx-auto mb-3 opacity-30 text-indigo-600" />
                    <p className="font-semibold text-slate-600">No call logs found</p>
                    <p className="text-xs mt-1 text-slate-400 font-medium">Calls will automatically sync here from the mobile app</p>
                  </td>
                </tr>
              ) : (
                calls.map((call) => {
                  return (
                    <tr 
                      key={call.id} 
                      className="hover:bg-slate-100/40 hover:-translate-y-[0.5px] transition-all duration-200 group font-medium cursor-pointer"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <button onClick={(e) => toggleImportant(call.id, e)} className="shrink-0">
                            <Star
                              size={14}
                              className={call.isImportant ? "fill-yellow-400 text-yellow-400" : "text-slate-300 group-hover:text-slate-400 transition-colors"}
                            />
                          </button>
                          {/* Avatar initials badge */}
                          {renderAvatar(call.contactName, call.mobileNumber)}
                          <div className="min-w-0">
                            {call.contactName ? (
                              <>
                                <p className="font-semibold text-slate-800 truncate">{call.contactName}</p>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{call.mobileNumber}</p>
                              </>
                            ) : (
                              <>
                                <p className="font-semibold text-amber-600 truncate flex items-center gap-1 text-xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                                  New Lead
                                </p>
                                <p className="text-xs font-semibold text-slate-800 font-mono mt-0.5">{call.mobileNumber}</p>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {renderCallTypeBadge(call.callType)}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 font-medium">
                        <span className="bg-slate-50 px-2 py-1 rounded-md border border-slate-150 text-xs font-semibold text-slate-700">
                          {call.importedBy?.name || "System"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 font-mono text-xs whitespace-nowrap">
                        {formatDateFriendly(call.date)}
                      </td>
                      <td className="px-4 py-3.5">
                        {call.callType === "MISSED" ? (
                          <span className="text-[10px] bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded font-bold font-mono">
                            Ring: {call.duration}s
                          </span>
                        ) : call.duration === 0 ? (
                          <span className="text-slate-400 font-normal">—</span>
                        ) : (
                          <span className="font-mono font-bold text-slate-800 text-xs bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 shadow-sm">
                            {formatDuration(call.duration)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-slate-500 text-xs font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-200/50">
                          {call.simSlot.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {call.tags.length === 0 ? (
                          <Link href={`/call-logs/${call.id}`} className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 hover:border-indigo-200 border border-dashed border-slate-200 px-2 py-0.5 rounded transition-all cursor-pointer">
                            + Add Tag
                          </Link>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {call.tags.slice(0, 3).map(({ tag }) => (
                              <span
                                key={tag.id}
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm"
                                style={{ backgroundColor: tag.color }}
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {call._count.notes > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-lg">
                            <StickyNote size={11} className="text-indigo-500" />
                            <span>{call._count.notes} Note</span>
                          </span>
                        ) : (
                          <Link href={`/call-logs/${call.id}`} className="text-[10px] font-bold text-slate-400 hover:text-amber-600 hover:border-amber-200 border border-dashed border-slate-200 px-2 py-0.5 rounded transition-all cursor-pointer">
                            + Add Note
                          </Link>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/call-logs/${call.id}`}
                          className="text-indigo-600 hover:text-indigo-800 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Load More */}
        {hasMore && (
          <div className="px-4 py-4 border-t border-slate-100 text-center bg-white/30 backdrop-blur-sm">
            <button
              onClick={() => fetchCalls(false)}
              disabled={loading}
              className="px-6 py-2 text-sm text-indigo-600 hover:bg-indigo-50 border border-indigo-100 hover:border-indigo-200 rounded-lg transition-colors font-semibold shadow-sm bg-white disabled:opacity-50"
            >
              {loading ? "Loading..." : "Load more logs"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
