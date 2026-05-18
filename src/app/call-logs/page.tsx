"use client";
// src/app/call-logs/page.tsx

import { useEffect, useState, useCallback } from "react";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Star, StickyNote, Plus, Upload, Search } from "lucide-react";
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
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Call Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} total records</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <Upload size={15} className="rotate-180" />
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
          <Link
            href="/call-logs/import"
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Upload size={15} />
            Import
          </Link>
          <Link
            href="/call-logs/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={15} />
            Add Call
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search number, name, notes..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Employee Filter */}
          <div className="relative max-w-xs">
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
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
          <div className="relative max-w-xs">
            <select
              value={simSlot}
              onChange={(e) => setSimSlot(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
            >
              <option value="ALL">All SIM Slots</option>
              <option value="SIM_1">SIM 1</option>
              <option value="SIM_2">SIM 2</option>
              <option value="UNKNOWN">Unknown SIM</option>
            </select>
          </div>

          {/* Call type tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setCallType(tab.value)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md transition-colors",
                  callType === tab.value
                    ? "bg-white text-gray-900 font-medium shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Synced By</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date & Time</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Duration</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">SIM</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tags</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && calls.length === 0 ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : calls.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center text-gray-400">
                  <Phone size={32} className="mx-auto mb-3 opacity-30" />
                  <p>No call logs found</p>
                  <p className="text-xs mt-1">Import call logs or add manually</p>
                </td>
              </tr>
            ) : (
              calls.map((call) => {
                const Icon = CALL_TYPE_ICONS[call.callType as keyof typeof CALL_TYPE_ICONS] || Phone;
                const typeColors = getCallTypeColor(call.callType);

                return (
                  <tr key={call.id} className="hover:bg-gray-50 cursor-pointer group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => toggleImportant(call.id, e)}>
                          <Star
                            size={14}
                            className={call.isImportant ? "fill-yellow-400 text-yellow-400" : "text-gray-300 group-hover:text-gray-400"}
                          />
                        </button>
                        <div className="min-w-0">
                          {call.contactName ? (
                            <>
                              <p className="font-semibold text-gray-900 truncate">{call.contactName}</p>
                              <p className="text-[10px] text-gray-400 font-mono mt-0.5">{call.mobileNumber}</p>
                            </>
                          ) : (
                            <>
                              <p className="font-semibold text-amber-600 truncate flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                                New Lead
                              </p>
                              <p className="text-xs font-semibold text-gray-900 font-mono mt-0.5">{call.mobileNumber}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", typeColors)}>
                        <Icon size={11} />
                        {call.callType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-medium">
                      {call.importedBy?.name || "System"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDateTime(call.date)}</td>
                    <td className="px-4 py-3 text-gray-600 font-semibold">
                      {call.callType === "MISSED" ? (
                        <span className="text-[10px] bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded font-bold">
                          Ring: {call.duration}s
                        </span>
                      ) : call.duration === 0 ? (
                        <span className="text-gray-400 font-normal">—</span>
                      ) : (
                        formatDuration(call.duration)
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-medium">{call.simSlot.replace("_", " ")}</td>
                    <td className="px-4 py-3">
                      {call.tags.length === 0 ? (
                        <Link href={`/call-logs/${call.id}`} className="text-[10px] font-bold text-gray-400 hover:text-blue-600 hover:border-blue-200 border border-dashed border-gray-200 px-2 py-0.5 rounded transition-all cursor-pointer">
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
                    <td className="px-4 py-3">
                      {call._count.notes > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-lg">
                          <StickyNote size={11} className="text-blue-500" />
                          <span>{call._count.notes} Note</span>
                        </span>
                      ) : (
                        <Link href={`/call-logs/${call.id}`} className="text-[10px] font-bold text-gray-400 hover:text-amber-600 hover:border-amber-200 border border-dashed border-gray-200 px-2 py-0.5 rounded transition-all cursor-pointer">
                          + Add Note
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/call-logs/${call.id}`}
                        className="text-blue-600 hover:underline text-xs opacity-0 group-hover:opacity-100 transition-opacity"
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

        {/* Load More */}
        {hasMore && (
          <div className="px-4 py-4 border-t border-gray-100 text-center">
            <button
              onClick={() => fetchCalls(false)}
              disabled={loading}
              className="px-6 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Loading..." : "Load more"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
