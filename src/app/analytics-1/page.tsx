"use client";
// src/app/analytics-1/page.tsx — Periodic Reports (Analytics-1)

import { useState, useEffect, useCallback, Fragment } from "react";
import {
  Calendar, Users, BarChart2, Clock, Activity, FileText, Download,
  Search, ChevronDown, Check, X, Pin, Plus, AlertCircle, ChevronUp, Sliders,
  PhoneIncoming, PhoneOutgoing, PhoneMissed, Phone, TrendingUp,
  ArrowDownLeft, ArrowUpRight, PhoneOff, User, StickyNote, Star, Smartphone, Tag
} from "lucide-react";
import Link from "next/link";
import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";

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
  notes: { id: string; content: string }[];
  importedBy?: { id: string; name: string; email: string } | null;
}

const TABS = [
  { id: "SUMMARY", label: "Summary", icon: FileText },
  { id: "ANALYSIS", label: "Analysis", icon: BarChart2 },
  { id: "DAY_WISE", label: "Day-wise Analysis", icon: Calendar },
  { id: "HOURLY", label: "Hourly Analysis", icon: Clock },
  { id: "NEVER_ATTENDED", label: "Never Attended", icon: AlertCircle },
  { id: "NOT_PICKUP", label: "Not Pickup by Client", icon: Clock },
  { id: "UNIQUE_CLIENTS", label: "Unique Clients", icon: Users },
  { id: "CALL_HISTORY", label: "Call History", icon: FileText },
];

export default function Analytics1Page() {
  const [activeTab, setActiveTab] = useState("CALL_HISTORY");
  const [filtersOpen, setFiltersOpen] = useState(true);

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
  
  // Filter States (Top Bar)
  const [fromDate, setFromDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedEmployee, setSelectedEmployee] = useState("ALL");
  const [selectedCallType, setSelectedCallType] = useState("ALL");
  const [excludeNumbers, setExcludeNumbers] = useState(true);

  // Table Data States
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(50);
  const [members, setMembers] = useState<any[]>([]);

  // Column Header Search/Filter States
  const [searchEmployee, setSearchEmployee] = useState("");
  const [searchToNumber, setSearchToNumber] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [searchCallType, setSearchCallType] = useState("ALL");
  const [searchNotes, setSearchNotes] = useState("");

  const orgId = typeof window !== "undefined" ? localStorage.getItem("currentOrgId") || "" : "";

  // Load organization members
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

  // Fetch filtered call logs
  const fetchLogs = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    
    const params = new URLSearchParams({
      limit: limit.toString(),
      ...(selectedEmployee !== "ALL" ? { userId: selectedEmployee } : {}),
      ...(selectedCallType !== "ALL" ? { callType: selectedCallType } : {}),
      ...(searchToNumber ? { search: searchToNumber } : {}),
      ...(fromDate ? { dateFrom: `${fromDate}T00:00:00.000Z` } : {}),
      ...(toDate ? { dateTo: `${toDate}T23:59:59.999Z` } : {}),
    });

    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/call-logs?${params}`);
      const data = await res.json();
      if (data.success) {
        let list: CallLog[] = data.data.data;

        // Apply local filtering to exactly match column-specific headers
        if (searchEmployee) {
          list = list.filter(c => 
            (c.importedBy?.name || "System").toLowerCase().includes(searchEmployee.toLowerCase())
          );
        }
        if (searchDate) {
          list = list.filter(c => 
            new Date(c.date).toLocaleDateString("en-IN").includes(searchDate)
          );
        }
        if (searchCallType !== "ALL") {
          list = list.filter(c => c.callType === searchCallType);
        }

        setCalls(list);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [orgId, limit, selectedEmployee, selectedCallType, searchEmployee, searchToNumber, searchDate, searchCallType, fromDate, toDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Format Duration into Xh Ym Zs
  const formatHMS = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const formatHMSOptional = (seconds: number): string => {
    return seconds > 0 ? formatHMS(seconds) : "—";
  };

  const formatHHMMSS = (seconds: number): string => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  // Aggregation for Unique Clients
  const uniqueClientsData = (() => {
    const groups: { [key: string]: CallLog[] } = {};
    for (const call of calls) {
      if (!groups[call.mobileNumber]) {
        groups[call.mobileNumber] = [];
      }
      groups[call.mobileNumber].push(call);
    }

    return Object.entries(groups).map(([number, clientCalls]) => {
      const contactName = clientCalls.find(c => c.contactName)?.contactName || "Unknown";
      
      const totalDuration = clientCalls.reduce((acc, c) => acc + c.duration, 0);
      
      const incomingCalls = clientCalls.filter(c => c.callType === "INCOMING");
      const incomingDuration = incomingCalls.reduce((acc, c) => acc + c.duration, 0);
      
      const outgoingCalls = clientCalls.filter(c => c.callType === "OUTGOING");
      const outgoingDuration = outgoingCalls.reduce((acc, c) => acc + c.duration, 0);
      
      const missedCalls = clientCalls.filter(c => c.callType === "MISSED").length;
      const rejectedCalls = clientCalls.filter(c => c.callType === "REJECTED").length;
      
      const connectedCalls = clientCalls.filter(c => c.duration > 0).length;
      
      // Never Attended
      const hasMissed = clientCalls.some(c => c.callType === "MISSED");
      const hasConnection = clientCalls.some(c => c.duration > 0 && (c.callType === "INCOMING" || c.callType === "OUTGOING"));
      const neverAttended = (hasMissed && !hasConnection) ? 1 : 0;
      
      // Not Pickup
      const hasOutgoingUnanswered = clientCalls.some(c => c.callType === "OUTGOING" && c.duration === 0);
      const hasAnyConnection = clientCalls.some(c => c.duration > 0);
      const notPickup = (hasOutgoingUnanswered && !hasAnyConnection) ? 1 : 0;
      
      const sorted = [...clientCalls].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const lastCall = sorted[0];

      return {
        mobileNumber: number,
        contactName,
        totalCalls: clientCalls.length,
        totalDuration,
        incomingCalls: incomingCalls.length,
        incomingDuration,
        outgoingCalls: outgoingCalls.length,
        outgoingDuration,
        missedCalls,
        rejectedCalls,
        connectedCalls,
        neverAttended,
        notPickup,
        lastCall
      };
    });
  })();

  const togglePin = async (callId: string) => {
    if (!orgId) return;
    await fetch(`/api/v1/organizations/${orgId}/call-logs/${callId}/important`, { method: "PATCH" });
    fetchLogs();
  };

  return (
    <div className="space-y-6">
      
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Periodic Reports</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Export Dropdown */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors uppercase">
            <Download size={13} />
            <span>Export</span>
            <ChevronDown size={12} />
          </button>
          {/* Collapse/Expand Filters */}
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-amber-300 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors uppercase"
          >
            <span>Filters</span>
            {filtersOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* ── Filters Section ── */}
      {filtersOpen && (
        <div className="bg-white rounded-xl border border-gray-150 p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            
            {/* From Date */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50"
              />
            </div>

            {/* To Date */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50"
              />
            </div>

            {/* Select Employee Tags */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Select Employee Tags</label>
              <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50 cursor-pointer">
                <option value="ALL">Select</option>
              </select>
            </div>

            {/* Select Employees */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Select Employees</label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50 cursor-pointer"
              >
                <option value="ALL">Select</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Select Call Type */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Select Call Type</label>
              <select
                value={selectedCallType}
                onChange={(e) => setSelectedCallType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50 cursor-pointer"
              >
                <option value="ALL">Select</option>
                <option value="INCOMING">Incoming</option>
                <option value="OUTGOING">Outgoing</option>
                <option value="MISSED">Missed</option>
              </select>
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-1 items-end">
            
            {/* Select Call Method */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Select Call Method</label>
              <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50 cursor-pointer">
                <option value="ALL">Select</option>
              </select>
            </div>

            {/* Select Duration */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Select Duration</label>
              <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50 cursor-pointer">
                <option value="ALL">Select</option>
              </select>
            </div>

            {/* Select Call Time */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Select Call Time</label>
              <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50 cursor-pointer">
                <option value="ALL">Select</option>
              </select>
            </div>

            {/* Filter Buttons */}
            <div className="col-span-2 flex gap-3">
              <button
                onClick={fetchLogs}
                className="flex-1 py-2 bg-amber-500 text-white rounded-lg text-sm font-bold hover:bg-amber-600 transition-colors shadow-sm"
              >
                Apply
              </button>
              <button
                onClick={() => {
                  setSelectedEmployee("ALL");
                  setSelectedCallType("ALL");
                  setFromDate(new Date().toISOString().split("T")[0]);
                  setToDate(new Date().toISOString().split("T")[0]);
                  fetchLogs();
                }}
                className="flex-1 py-2 border border-amber-500 text-amber-600 rounded-lg text-sm font-bold hover:bg-amber-50 transition-colors"
              >
                Reset
              </button>
            </div>

          </div>

          {/* Exclude Checkbox */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="exclude"
              checked={excludeNumbers}
              onChange={(e) => setExcludeNumbers(e.target.checked)}
              className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500 accent-amber-500"
            />
            <label htmlFor="exclude" className="text-xs font-bold text-gray-600">
              Exclude Numbers Mentioned in <span className="text-amber-600 cursor-pointer hover:underline">Exclude Phone Numbers</span>
            </label>
          </div>

        </div>
      )}

      {/* ── Active Date Badge ── */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-800 rounded-lg border border-amber-100 w-fit text-sm font-bold shadow-sm">
        <Calendar size={15} />
        <span>
          {new Date(fromDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} to {new Date(toDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <div className="flex gap-6 min-w-max pb-0.5">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-1 text-sm font-bold flex items-center gap-2 transition-all border-b-2 outline-none ${
                  isActive
                    ? "border-amber-500 text-amber-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Call History Tab View ── */}
      {activeTab === "CALL_HISTORY" && (
        <div className="bg-gradient-to-br from-white/95 to-slate-50/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-100/40 p-1 overflow-hidden">
          
          {/* Limit selector */}
          <div className="flex items-center justify-end p-4 border-b border-slate-200/50 gap-2 bg-slate-50/30">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Show</span>
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="px-2.5 py-1 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white cursor-pointer text-slate-700"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* Call History Table */}
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-slate-100/80 to-slate-50/80 text-slate-600 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-200/80">
                  <th className="py-4 px-4 font-bold min-w-[60px]">
                    <span>Sr. No.</span>
                  </th>
                  
                  {/* Employee with Search Box */}
                  <th className="py-4 px-4 font-bold min-w-[200px]">
                    <span className="flex items-center gap-1.5 mb-2">
                      <User size={13} className="text-slate-400 stroke-[2]" />
                      Employee
                    </span>
                    <div className="relative">
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search"
                        value={searchEmployee}
                        onChange={(e) => setSearchEmployee(e.target.value)}
                        className="w-full pl-7 pr-3 py-1 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white text-slate-700 shadow-sm"
                      />
                    </div>
                  </th>

                  {/* To Number with Search Box */}
                  <th className="py-4 px-4 font-bold min-w-[240px]">
                    <span className="flex items-center gap-1.5 mb-2">
                      <Smartphone size={13} className="text-slate-400 stroke-[2]" />
                      To Number
                    </span>
                    <div className="relative">
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search"
                        value={searchToNumber}
                        onChange={(e) => setSearchToNumber(e.target.value)}
                        className="w-full pl-7 pr-3 py-1 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white text-slate-700 shadow-sm"
                      />
                    </div>
                  </th>

                  {/* Date with Filter */}
                  <th className="py-4 px-4 font-bold min-w-[150px]">
                    <span className="flex items-center gap-1.5 mb-2">
                      <Calendar size={13} className="text-slate-400 stroke-[2]" />
                      Date
                    </span>
                    <input
                      type="text"
                      placeholder="Select Date"
                      value={searchDate}
                      onChange={(e) => setSearchDate(e.target.value)}
                      className="w-full px-2.5 py-1 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white text-slate-700 shadow-sm"
                    />
                  </th>

                  <th className="py-4 px-4 font-bold min-w-[100px]">
                    <span className="flex items-center gap-1.5">
                      <Clock size={13} className="text-slate-400 stroke-[2]" />
                      Time
                    </span>
                  </th>
                  
                  <th className="py-4 px-4 font-bold min-w-[120px]">
                    <span className="flex items-center gap-1.5">
                      <Clock size={13} className="text-slate-400 stroke-[2]" />
                      Duration
                    </span>
                  </th>

                  {/* Call Type Dropdown */}
                  <th className="py-4 px-4 font-bold min-w-[150px]">
                    <span className="flex items-center gap-1.5 mb-2">
                      <Phone size={13} className="text-slate-400 stroke-[2]" />
                      Call Type
                    </span>
                    <select
                      value={searchCallType}
                      onChange={(e) => setSearchCallType(e.target.value)}
                      className="w-full px-2.5 py-1 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white cursor-pointer text-slate-700 shadow-sm"
                    >
                      <option value="ALL">Select</option>
                      <option value="INCOMING">Incoming</option>
                      <option value="OUTGOING">Outgoing</option>
                      <option value="MISSED">Missed</option>
                    </select>
                  </th>

                  {/* Notes with Search */}
                  <th className="py-4 px-4 font-bold min-w-[180px]">
                    <span className="flex items-center gap-1.5 mb-2">
                      <StickyNote size={13} className="text-slate-400 stroke-[2]" />
                      Notes
                    </span>
                    <div className="relative">
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search"
                        value={searchNotes}
                        onChange={(e) => setSearchNotes(e.target.value)}
                        className="w-full pl-7 pr-3 py-1 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white text-slate-700 shadow-sm"
                      />
                    </div>
                  </th>

                </tr>
              </thead>
              
              <tbody className="divide-y divide-slate-100 text-slate-700 bg-white/50">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 text-sm font-semibold">
                      Loading call logs...
                    </td>
                  </tr>
                ) : calls.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 text-sm font-semibold">
                      No call records found under active filters.
                    </td>
                  </tr>
                ) : (
                  calls.map((call, index) => {
                    return (
                      <tr 
                        key={call.id} 
                        className="hover:bg-slate-100/40 hover:-translate-y-[0.5px] transition-all duration-200 group font-medium cursor-pointer"
                      >
                        {/* Sr No */}
                        <td className="py-4 px-4 font-bold text-slate-500 text-center">{index + 1}</td>
                        
                        {/* Employee info */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className="bg-slate-50 px-2 py-1 rounded-md border border-slate-100 text-xs font-semibold text-slate-700">
                              {call.importedBy?.name || "System"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({call.importedBy?.email.split("@")[0] || "9921640630"})
                            </span>
                          </div>
                        </td>

                        {/* To Number / Client */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => togglePin(call.id)}
                              className={`p-1 rounded-md hover:bg-slate-100 transition-colors shrink-0 ${
                                call.isImportant ? "text-amber-500" : "text-slate-300 group-hover:text-slate-400"
                              }`}
                              title={call.isImportant ? "Unpin" : "Pin Call"}
                            >
                              <Pin size={13} className={call.isImportant ? "fill-amber-500 text-amber-500" : ""} />
                            </button>

                            {/* Avatar initials badge */}
                            {renderAvatar(call.contactName, call.mobileNumber)}

                            <div className="min-w-0">
                              {call.contactName ? (
                                <>
                                  <p className="font-semibold text-slate-800 hover:underline cursor-pointer truncate">
                                    {call.contactName}
                                  </p>
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

                        {/* Date */}
                        <td className="py-4 px-4 text-slate-500 font-mono text-xs whitespace-nowrap">
                          {new Date(call.date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                        </td>

                        {/* Time */}
                        <td className="py-4 px-4 text-slate-500 font-mono text-xs whitespace-nowrap">
                          {new Date(call.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }).toLowerCase()}
                        </td>

                        {/* Duration */}
                        <td className="py-4 px-4">
                          {call.callType === "MISSED" ? (
                            <span className="text-slate-400 font-normal">—</span>
                          ) : call.duration === 0 ? (
                            <span className="text-slate-400 font-normal">—</span>
                          ) : (
                            <span className="font-mono font-bold text-slate-800 text-xs bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 shadow-sm">
                              {formatHMS(call.duration)}
                            </span>
                          )}
                        </td>

                        {/* Call Type Badge */}
                        <td className="py-4 px-4">
                          {renderCallTypeBadge(call.callType)}
                        </td>

                        {/* Notes */}
                        <td className="py-4 px-4">
                          {call.notes && call.notes.length > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-50/50 text-indigo-700 border border-indigo-100/50 px-2 py-0.5 rounded-lg">
                              <StickyNote size={11} className="text-indigo-500 shrink-0" />
                              <span className="truncate max-w-[130px]">{call.notes[0].content}</span>
                            </span>
                          ) : (
                            <button className="text-[10px] font-bold text-slate-400 hover:text-amber-600 hover:border-amber-200 border border-dashed border-slate-200 px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1">
                              <Plus size={11} />
                              <span>Add Note</span>
                            </button>
                          )}
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* ── Unique Clients Tab View ── */}
      {activeTab === "UNIQUE_CLIENTS" && (
        <div className="bg-white rounded-xl border border-gray-150 shadow-sm overflow-hidden animate-fadeIn">
          
          {/* Limit selector */}
          <div className="flex items-center justify-end p-4 border-b border-gray-100 gap-2 bg-gray-50/50">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Show</span>
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="px-2.5 py-1 border border-gray-300 rounded-lg text-xs font-semibold focus:ring-amber-500 bg-white cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold border-b border-gray-100">
                  <th className="py-4 px-3 font-bold text-center">Sr. No.</th>
                  <th className="py-4 px-3 font-bold min-w-[150px]">Client</th>
                  <th className="py-4 px-3 font-bold text-center">Total Calls</th>
                  <th className="py-4 px-3 font-bold">Total Duration</th>
                  <th className="py-4 px-3 font-bold text-center">Incoming Calls</th>
                  <th className="py-4 px-3 font-bold">Incoming Duration</th>
                  <th className="py-4 px-3 font-bold text-center">Outgoing Calls</th>
                  <th className="py-4 px-3 font-bold">Outgoing Duration</th>
                  <th className="py-4 px-3 font-bold text-center">Missed</th>
                  <th className="py-4 px-3 font-bold text-center">Rejected</th>
                  <th className="py-4 px-3 font-bold text-center">Connected Calls</th>
                  <th className="py-4 px-3 font-bold text-center">Never Attended</th>
                  <th className="py-4 px-3 font-bold text-center">Not Pickup by Client</th>
                  <th className="py-4 px-3 font-bold min-w-[220px]">Last Call Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={14} className="py-12 text-center text-gray-400 text-sm font-semibold">
                      Loading unique clients analytics...
                    </td>
                  </tr>
                ) : uniqueClientsData.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-12 text-center text-gray-400 text-sm font-semibold">
                      No unique clients found under active filters.
                    </td>
                  </tr>
                ) : (
                  uniqueClientsData.map((client, index) => {
                    const lastCall = client.lastCall;
                    const isLastIncoming = lastCall?.callType === "INCOMING";
                    const isLastOutgoing = lastCall?.callType === "OUTGOING";
                    const isLastMissed = lastCall?.callType === "MISSED";
                    const isLastRejected = lastCall?.callType === "REJECTED";

                    return (
                      <tr key={client.mobileNumber} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-3 font-bold text-gray-600 text-center">{index + 1}</td>
                        <td className="py-4 px-3 font-medium">
                          <p className="text-gray-900 font-semibold">{client.contactName}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{client.mobileNumber}</p>
                        </td>
                        <td className="py-4 px-3 font-bold text-gray-900 text-center">{client.totalCalls}</td>
                        <td className="py-4 px-3 font-semibold text-gray-800">{formatHMSOptional(client.totalDuration)}</td>
                        <td className="py-4 px-3 text-center">{client.incomingCalls}</td>
                        <td className="py-4 px-3 font-semibold text-gray-800">{formatHMSOptional(client.incomingDuration)}</td>
                        <td className="py-4 px-3 text-center">{client.outgoingCalls}</td>
                        <td className="py-4 px-3 font-semibold text-gray-800">{formatHMSOptional(client.outgoingDuration)}</td>
                        <td className="py-4 px-3 text-center">{client.missedCalls}</td>
                        <td className="py-4 px-3 text-center">{client.rejectedCalls}</td>
                        <td className="py-4 px-3 text-center font-bold text-gray-900">{client.connectedCalls}</td>
                        <td className="py-4 px-3 text-center">
                          <span className={client.neverAttended > 0 ? "px-2 py-0.5 rounded bg-red-50 text-red-700 font-bold" : ""}>
                            {client.neverAttended}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-center">
                          <span className={client.notPickup > 0 ? "px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold" : ""}>
                            {client.notPickup}
                          </span>
                        </td>
                        <td className="py-4 px-3">
                          {lastCall ? (
                            <div className="space-y-1">
                              <p className="text-gray-900 font-semibold leading-tight">
                                {lastCall.importedBy?.name || "System"}{" "}
                                <span className="text-[10px] font-normal text-gray-500 block md:inline">
                                  ({lastCall.importedBy?.email.split("@")[0] || "9921640630"})
                                </span>
                              </p>
                              <p className="text-[10px] text-gray-500 font-medium">
                                {new Date(lastCall.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })},{" "}
                                {new Date(lastCall.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                              </p>
                              {lastCall.duration > 0 && (
                                <p className="text-[10px] text-gray-700 font-semibold">{formatHMS(lastCall.duration)}</p>
                              )}
                              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold w-fit mt-1 border ${
                                isLastIncoming
                                  ? "bg-green-50 text-green-700 border-green-100"
                                  : isLastOutgoing
                                  ? "bg-blue-50 text-blue-700 border-blue-100"
                                  : isLastMissed
                                  ? "bg-red-50 text-red-700 border-red-100"
                                  : "bg-gray-50 text-gray-700 border-gray-100"
                              }`}>
                                {isLastIncoming && <PhoneIncoming size={10} />}
                                {isLastOutgoing && <PhoneOutgoing size={10} />}
                                {isLastMissed && <PhoneMissed size={10} />}
                                <span className="capitalize">{lastCall.callType.toLowerCase()}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Never Attended Tab View ── */}
      {activeTab === "NEVER_ATTENDED" && (() => {
        const neverAttendedClients = uniqueClientsData.filter(client => client.neverAttended > 0);
        return (
          <div className="bg-white rounded-xl border border-gray-150 shadow-sm overflow-hidden animate-fadeIn">
            
            {/* Limit selector */}
            <div className="flex items-center justify-end p-4 border-b border-gray-100 gap-2 bg-gray-50/50">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Show</span>
              <select
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="px-2.5 py-1 border border-gray-300 rounded-lg text-xs font-semibold focus:ring-amber-500 bg-white cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold border-b border-gray-100">
                    <th className="py-4 px-4 font-bold text-center">Sr. No.</th>
                    <th className="py-4 px-4 font-bold min-w-[180px]">Client</th>
                    <th className="py-4 px-4 font-bold text-center">Total Attempts</th>
                    <th className="py-4 px-4 font-bold min-w-[200px]">Last Attempt Date & Time</th>
                    <th className="py-4 px-4 font-bold min-w-[180px]">Last Tried By</th>
                    <th className="py-4 px-4 font-bold text-center">SIM Slot</th>
                    <th className="py-4 px-4 font-bold">Device Name</th>
                    <th className="py-4 px-4 font-bold text-center">Status</th>
                    <th className="py-4 px-4 font-bold min-w-[150px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-gray-400 text-sm font-semibold">
                        Loading unanswered incoming calls...
                      </td>
                    </tr>
                  ) : neverAttendedClients.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-gray-400 text-sm font-semibold">
                        No clients found under "Never Attended" for active period.
                      </td>
                    </tr>
                  ) : (
                    neverAttendedClients.map((client, index) => {
                      const lastCall = client.lastCall;
                      return (
                        <tr key={client.mobileNumber} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 px-4 font-bold text-gray-600 text-center">{index + 1}</td>
                          <td className="py-4 px-4 font-medium">
                            <p className="text-gray-900 font-semibold">{client.contactName}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">{client.mobileNumber}</p>
                          </td>
                          <td className="py-4 px-4 font-bold text-gray-950 text-center">{client.totalCalls} Dials</td>
                          <td className="py-4 px-4 font-semibold text-gray-800">
                            {lastCall ? (
                              <span>
                                {new Date(lastCall.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })},{" "}
                                {new Date(lastCall.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                              </span>
                            ) : (
                              <span>—</span>
                            )}
                          </td>
                          <td className="py-4 px-4 font-medium">
                            {lastCall ? (
                              <div>
                                <p className="text-gray-900 font-semibold">{lastCall.importedBy?.name || "System"}</p>
                                <p className="text-[10px] text-gray-500">({lastCall.importedBy?.email.split("@")[0] || "9921640630"})</p>
                              </div>
                            ) : (
                              <span>—</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center font-semibold text-gray-700">
                            {lastCall?.simSlot ? `SIM ${lastCall.simSlot}` : "—"}
                          </td>
                          <td className="py-4 px-4 font-semibold text-gray-700">
                            {lastCall?.deviceName || "—"}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="px-2.5 py-0.5 rounded-lg bg-red-50 text-red-700 font-bold border border-red-100 text-[10px]">
                              Never Attended
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            {lastCall?.notes && lastCall.notes.length > 0 ? (
                              <p className="text-xs text-gray-600 font-medium">{lastCall.notes[0].content}</p>
                            ) : (
                              <button className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 transition-colors">
                                <Plus size={11} />
                                <span>Add Note</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ── Not Pickup by Client Tab View ── */}
      {activeTab === "NOT_PICKUP" && (() => {
        const notPickupClients = uniqueClientsData.filter(client => client.notPickup > 0);
        return (
          <div className="bg-white rounded-xl border border-gray-150 shadow-sm overflow-hidden animate-fadeIn">
            
            {/* Limit selector */}
            <div className="flex items-center justify-end p-4 border-b border-gray-100 gap-2 bg-gray-50/50">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Show</span>
              <select
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="px-2.5 py-1 border border-gray-300 rounded-lg text-xs font-semibold focus:ring-amber-500 bg-white cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold border-b border-gray-100">
                    <th className="py-4 px-4 font-bold text-center">Sr. No.</th>
                    <th className="py-4 px-4 font-bold min-w-[180px]">Client</th>
                    <th className="py-4 px-4 font-bold text-center">Total Attempts</th>
                    <th className="py-4 px-4 font-bold min-w-[200px]">Last Attempt Date & Time</th>
                    <th className="py-4 px-4 font-bold min-w-[180px]">Last Tried By</th>
                    <th className="py-4 px-4 font-bold text-center">SIM Slot</th>
                    <th className="py-4 px-4 font-bold">Device Name</th>
                    <th className="py-4 px-4 font-bold text-center">Status</th>
                    <th className="py-4 px-4 font-bold min-w-[150px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-gray-400 text-sm font-semibold">
                        Loading unanswered outgoing calls...
                      </td>
                    </tr>
                  ) : notPickupClients.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-gray-400 text-sm font-semibold">
                        No clients found under "Not Pickup by Client" for active period.
                      </td>
                    </tr>
                  ) : (
                    notPickupClients.map((client, index) => {
                      const lastCall = client.lastCall;
                      return (
                        <tr key={client.mobileNumber} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 px-4 font-bold text-gray-600 text-center">{index + 1}</td>
                          <td className="py-4 px-4 font-medium">
                            <p className="text-gray-900 font-semibold">{client.contactName}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">{client.mobileNumber}</p>
                          </td>
                          <td className="py-4 px-4 font-bold text-gray-950 text-center">{client.totalCalls} Dials</td>
                          <td className="py-4 px-4 font-semibold text-gray-800">
                            {lastCall ? (
                              <span>
                                {new Date(lastCall.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })},{" "}
                                {new Date(lastCall.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                              </span>
                            ) : (
                              <span>—</span>
                            )}
                          </td>
                          <td className="py-4 px-4 font-medium">
                            {lastCall ? (
                              <div>
                                <p className="text-gray-900 font-semibold">{lastCall.importedBy?.name || "System"}</p>
                                <p className="text-[10px] text-gray-500">({lastCall.importedBy?.email.split("@")[0] || "9921640630"})</p>
                              </div>
                            ) : (
                              <span>—</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center font-semibold text-gray-700">
                            {lastCall?.simSlot ? `SIM ${lastCall.simSlot}` : "—"}
                          </td>
                          <td className="py-4 px-4 font-semibold text-gray-700">
                            {lastCall?.deviceName || "—"}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-700 font-bold border border-amber-100 text-[10px]">
                              Not Pickup
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            {lastCall?.notes && lastCall.notes.length > 0 ? (
                              <p className="text-xs text-gray-600 font-medium">{lastCall.notes[0].content}</p>
                            ) : (
                              <button className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 transition-colors">
                                <Plus size={11} />
                                <span>Add Note</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ── Hourly Analysis Tab View ── */}
      {activeTab === "HOURLY" && (() => {
        // 1. Calculate overall totals across all filtered calls
        const grandTotalCalls = calls.length;
        const grandTotalConnected = calls.filter(c => c.duration > 0 && c.callType !== "MISSED").length;
        const grandTotalDuration = calls.reduce((acc, c) => acc + (c.callType === "MISSED" ? 0 : c.duration), 0);

        // 2. Generate 24 Hourly slots starting from 12:00 AM
        const hourlySlots = Array.from({ length: 24 }, (_, i) => {
          const hour24 = i;
          let label = "";
          if (hour24 === 0) label = "12:00 AM - 12:59 AM";
          else if (hour24 < 12) label = `${String(hour24).padStart(2, "0")}:00 AM - ${String(hour24).padStart(2, "0")}:59 AM`;
          else if (hour24 === 12) label = "12:00 PM - 12:59 PM";
          else {
            const h12 = hour24 - 12;
            label = `${String(h12).padStart(2, "0")}:00 PM - ${String(h12).padStart(2, "0")}:59 PM`;
          }

          const slotCalls = calls.filter(c => new Date(c.date).getHours() === hour24);
          const totalCalls = slotCalls.length;
          const connectedCalls = slotCalls.filter(c => c.duration > 0 && c.callType !== "MISSED").length;
          const totalDuration = slotCalls.reduce((acc, c) => acc + (c.callType === "MISSED" ? 0 : c.duration), 0);

          const callsPercent = grandTotalCalls > 0 ? (totalCalls / grandTotalCalls) * 100 : 0;
          const connectedPercent = grandTotalConnected > 0 ? (connectedCalls / grandTotalConnected) * 100 : 0;
          const durationPercent = grandTotalDuration > 0 ? (totalDuration / grandTotalDuration) * 100 : 0;

          return {
            hour24,
            label,
            totalCalls,
            connectedCalls,
            totalDuration,
            callsPercent,
            connectedPercent,
            durationPercent,
          };
        });

        // 3. Define time slots for the Employee Summary nested table
        const summarySlots = [
          {
            id: "before_10",
            label: "Before 10:00 AM",
            filter: (c: CallLog) => new Date(c.date).getHours() < 10
          },
          ...Array.from({ length: 14 }, (_, idx) => {
            const hour24 = idx + 10; // 10 to 23
            const hour12 = hour24 > 12 ? hour24 - 12 : hour24;
            const ampm = hour24 >= 12 ? "PM" : "AM";
            const label = `${String(hour12).padStart(2, "0")}:00 ${ampm} - ${String(hour12).padStart(2, "0")}:59 ${ampm}`;
            return {
              id: `hour_${hour24}`,
              label,
              filter: (c: CallLog) => new Date(c.date).getHours() === hour24
            };
          })
        ];

        // 4. Group data by employee (members)
        const filteredMembers = selectedEmployee === "ALL"
          ? members
          : members.filter(m => m.userId === selectedEmployee);

        const employeeRows = filteredMembers.map(m => {
          const empCalls = calls.filter(c => c.importedBy?.id === m.userId);

          const totalCalls = empCalls.length;
          const connectedCalls = empCalls.filter(c => c.duration > 0 && c.callType !== "MISSED").length;
          const totalDuration = empCalls.reduce((acc, c) => acc + (c.callType === "MISSED" ? 0 : c.duration), 0);

          const slotsData = summarySlots.map(slot => {
            const slotCalls = empCalls.filter(slot.filter);
            const total = slotCalls.length;
            const connected = slotCalls.filter(c => c.duration > 0 && c.callType !== "MISSED").length;
            const duration = slotCalls.reduce((acc, c) => acc + (c.callType === "MISSED" ? 0 : c.duration), 0);

            return {
              total,
              connected,
              duration
            };
          });

          return {
            name: m.user.name,
            totalCalls,
            connectedCalls,
            totalDuration,
            slotsData
          };
        });

        const chartData = hourlySlots.map(slot => {
          const shortLabel = slot.hour24 === 0 
            ? "12 AM" 
            : slot.hour24 === 12 
            ? "12 PM" 
            : slot.hour24 < 12 
            ? `${slot.hour24} AM` 
            : `${slot.hour24 - 12} PM`;
          
          return {
            name: shortLabel,
            "Total Calls": slot.totalCalls,
            "Connected Calls": slot.connectedCalls,
            "Duration (Min)": Math.round(slot.totalDuration / 60)
          };
        });

        const renderProgressCell = (percent: number, type: 'calls' | 'connected' | 'duration') => {
          let gradientClass = "";
          let textClass = "";
          let glowClass = "";
          
          if (type === 'calls') {
            gradientClass = "bg-gradient-to-r from-amber-400 to-orange-500";
            textClass = "text-orange-600 font-bold";
            glowClass = "shadow-[0_0_8px_rgba(249,115,22,0.2)]";
          } else if (type === 'connected') {
            gradientClass = "bg-gradient-to-r from-sky-400 to-blue-500";
            textClass = "text-blue-600 font-bold";
            glowClass = "shadow-[0_0_8px_rgba(14,165,233,0.2)]";
          } else {
            gradientClass = "bg-gradient-to-r from-violet-500 to-indigo-600";
            textClass = "text-indigo-600 font-bold";
            glowClass = "shadow-[0_0_8px_rgba(99,102,241,0.2)]";
          }

          return (
            <div className="flex flex-col items-center justify-center space-y-1 py-1 min-w-[70px]">
              <span className={`text-xs font-mono ${textClass}`}>{percent.toFixed(1)}%</span>
              <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden p-[1px]">
                <div 
                  className={`h-full ${gradientClass} rounded-full ${glowClass} transition-all duration-500 ease-out`} 
                  style={{ width: `${percent}%` }}
                ></div>
              </div>
            </div>
          );
        };

        return (
          <div className="space-y-8 animate-fadeIn">
            
            {/* ── Hourly Distribution Chart ── */}
            <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 gap-2">
                <div>
                  <h3 className="text-base font-bold text-gray-800">Hourly Call Distribution</h3>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">Visual representation of call volume and talk-time by hour</p>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-amber-500 rounded-sm"></span>
                    <span className="text-gray-600">Total Calls</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-sky-500 rounded-sm"></span>
                    <span className="text-gray-600">Connected Calls</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-nowrap">
                    <span className="w-3 h-0.5 bg-indigo-500 inline-block relative -top-0.5"></span>
                    <span className="text-gray-600">Duration (Min)</span>
                  </div>
                </div>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: -5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#9ca3af" 
                      fontSize={9} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      yAxisId="left"
                      stroke="#9ca3af" 
                      fontSize={9} 
                      tickLine={false} 
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke="#9ca3af" 
                      fontSize={9} 
                      tickLine={false} 
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white border border-gray-150 p-2.5 rounded-lg shadow-lg text-[11px] space-y-1">
                              <p className="font-bold text-gray-800 border-b border-gray-100 pb-1 mb-1">{label}</p>
                              {payload.map((p, idx) => (
                                <p key={idx} className="font-medium flex items-center justify-between gap-5">
                                  <span className="text-gray-500 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }}></span>
                                    {p.name}:
                                  </span>
                                  <span className="font-bold text-gray-900">{p.value}</span>
                                </p>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar yAxisId="left" dataKey="Total Calls" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={16} />
                    <Bar yAxisId="left" dataKey="Connected Calls" fill="#0ea5e9" radius={[3, 3, 0, 0]} maxBarSize={16} />
                    <Line yAxisId="right" type="monotone" dataKey="Duration (Min)" stroke="#6366f1" strokeWidth={2} dot={{ r: 2, stroke: "#6366f1", strokeWidth: 1, fill: "#fff" }} activeDot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Hourly Time Slot Details Table */}
            <div className="bg-gradient-to-br from-white/95 to-slate-50/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-100/40 p-1 overflow-hidden">
              <div className="overflow-x-auto rounded-xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-100/80 to-slate-50/80 text-slate-600 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-200/80">
                      <th className="py-4 px-5 min-w-[220px]">Hourly Time Slot</th>
                      <th className="py-4 px-4 text-center">Total Calls</th>
                      <th className="py-4 px-4 text-center">Total Connected Calls</th>
                      <th className="py-4 px-4">Total Duration</th>
                      <th className="py-4 px-4 text-center">Total Calls (%)</th>
                      <th className="py-4 px-4 text-center">Total Connected Calls (%)</th>
                      <th className="py-4 px-4 text-center">Total Duration (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 bg-white/50">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">
                          Loading Hourly Analysis...
                        </td>
                      </tr>
                    ) : grandTotalCalls === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">
                          No call data found for this period.
                        </td>
                      </tr>
                    ) : (
                      hourlySlots.map((slot) => (
                        <tr key={slot.hour24} className="hover:bg-slate-100/40 hover:-translate-y-[0.5px] transition-all duration-200 group font-medium">
                          {/* Time Slot Badge with Clock Icon */}
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-2.5">
                              <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform duration-200">
                                <Clock size={13} className="stroke-[2.5]" />
                              </div>
                              <span className="font-semibold text-slate-800 text-sm tracking-tight">{slot.label}</span>
                            </div>
                          </td>
                          {/* Monospace count badge */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-mono font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 text-xs shadow-sm">
                              {slot.totalCalls}
                            </span>
                          </td>
                          {/* Monospace connected count badge */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-mono font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 text-xs shadow-sm">
                              {slot.connectedCalls}
                            </span>
                          </td>
                          {/* Monospace Duration */}
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-slate-800 text-xs">
                              {formatHHMMSS(slot.totalDuration)}
                            </span>
                          </td>
                          {/* Custom Progress Cells */}
                          <td className="py-3.5 px-4 text-center">{renderProgressCell(slot.callsPercent, 'calls')}</td>
                          <td className="py-3.5 px-4 text-center">{renderProgressCell(slot.connectedPercent, 'connected')}</td>
                          <td className="py-3.5 px-4 text-center">{renderProgressCell(slot.durationPercent, 'duration')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Employee Summary Table */}
            <div className="space-y-3">
              <h2 className="text-base font-bold text-gray-800 px-1">Employee Summary</h2>
              <div className="bg-white rounded-xl border border-gray-150 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      {/* Top Header Row with Grouped/ColSpanned Columns */}
                      <tr className="bg-gray-100 text-gray-700 uppercase font-bold border-b border-gray-200">
                        <th rowSpan={2} className="py-3 px-4 font-bold border-r border-gray-200 min-w-[150px] align-middle">Employee</th>
                        <th colSpan={3} className="py-2 px-3 font-bold border-r border-gray-200 text-center">Total</th>
                        {summarySlots.map((slot) => (
                          <th key={slot.id} colSpan={3} className="py-2 px-3 font-bold border-r border-gray-200 text-center min-w-[240px]">
                            {slot.label}
                          </th>
                        ))}
                      </tr>
                      {/* Sub-Header Row */}
                      <tr className="bg-gray-50 text-gray-500 uppercase font-bold border-b border-gray-200">
                        <th className="py-2 px-2 font-bold text-center">Total Calls</th>
                        <th className="py-2 px-2 font-bold text-center">Total Connected</th>
                        <th className="py-2 px-2 font-bold border-r border-gray-200">Total Duration</th>
                        {summarySlots.map((slot) => (
                          <Fragment key={slot.id}>
                            <th className="py-2 px-2 font-bold text-center">Total Calls</th>
                            <th className="py-2 px-2 font-bold text-center">Total Connected</th>
                            <th className="py-2 px-2 font-bold border-r border-gray-200">Total Duration</th>
                          </Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {loading ? (
                        <tr>
                          <td colSpan={4 + summarySlots.length * 3} className="py-12 text-center text-gray-400 text-sm font-semibold">
                            Loading Employee Summary...
                          </td>
                        </tr>
                      ) : employeeRows.length === 0 ? (
                        <tr>
                          <td colSpan={4 + summarySlots.length * 3} className="py-12 text-center text-gray-400 text-sm font-semibold">
                            No employee data found.
                          </td>
                        </tr>
                      ) : (
                        employeeRows.map((row) => (
                          <tr key={row.name} className="hover:bg-gray-50/50 transition-colors font-medium">
                            {/* Employee Name */}
                            <td className="py-3 px-4 font-semibold text-gray-900 border-r border-gray-150 align-middle">
                              {row.name}
                            </td>
                            {/* Total Columns */}
                            <td className="py-3 px-2 text-center">{row.totalCalls}</td>
                            <td className="py-3 px-2 text-center font-semibold text-amber-700 bg-amber-50/10">{row.connectedCalls}</td>
                            <td className="py-3 px-2 border-r border-gray-150 font-semibold">{formatHHMMSS(row.totalDuration)}</td>
                            {/* Time Slots Columns */}
                            {row.slotsData.map((s, idx) => (
                              <Fragment key={idx}>
                                <td className="py-3 px-2 text-center">{s.total}</td>
                                <td className="py-3 px-2 text-center font-semibold text-amber-700 bg-amber-50/10">{s.connected}</td>
                                <td className="py-3 px-2 border-r border-gray-150 font-semibold">{formatHHMMSS(s.duration)}</td>
                              </Fragment>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Call History Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-base font-bold text-gray-800">Call History</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Show</span>
                  <select
                    value={limit}
                    onChange={(e) => setLimit(parseInt(e.target.value))}
                    className="px-2.5 py-1 border border-gray-300 rounded-lg text-xs font-semibold focus:ring-amber-500 bg-white cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-150 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase font-bold border-b border-gray-100">
                        <th className="py-4 px-4 font-bold min-w-[60px]">Sr. No.</th>
                        
                        {/* Employee with Search Box */}
                        <th className="py-4 px-4 font-bold min-w-[200px]">
                          <span className="block mb-2">Employee</span>
                          <div className="relative">
                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search"
                              value={searchEmployee}
                              onChange={(e) => setSearchEmployee(e.target.value)}
                              className="w-full pl-7 pr-3 py-1 border border-gray-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                            />
                          </div>
                        </th>

                        {/* To Number with Search Box */}
                        <th className="py-4 px-4 font-bold min-w-[220px]">
                          <span className="block mb-2">To Number</span>
                          <div className="relative">
                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search"
                              value={searchToNumber}
                              onChange={(e) => setSearchToNumber(e.target.value)}
                              className="w-full pl-7 pr-3 py-1 border border-gray-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                            />
                          </div>
                        </th>

                        {/* Date with Filter */}
                        <th className="py-4 px-4 font-bold min-w-[150px]">
                          <span className="block mb-2">Date</span>
                          <input
                            type="text"
                            placeholder="Select Date"
                            value={searchDate}
                            onChange={(e) => setSearchDate(e.target.value)}
                            className="w-full px-2.5 py-1 border border-gray-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                          />
                        </th>

                        <th className="py-4 px-4 font-bold min-w-[100px]">Time</th>
                        <th className="py-4 px-4 font-bold min-w-[120px]">Duration</th>

                        {/* Call Type Dropdown */}
                        <th className="py-4 px-4 font-bold min-w-[150px]">
                          <span className="block mb-2">Call Type</span>
                          <select
                            value={searchCallType}
                            onChange={(e) => setSearchCallType(e.target.value)}
                            className="w-full px-2.5 py-1 border border-gray-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white cursor-pointer"
                          >
                            <option value="ALL">Select</option>
                            <option value="INCOMING">Incoming</option>
                            <option value="OUTGOING">Outgoing</option>
                            <option value="MISSED">Missed</option>
                          </select>
                        </th>

                        {/* Notes with Search */}
                        <th className="py-4 px-4 font-bold min-w-[180px]">
                          <span className="block mb-2">Notes</span>
                          <div className="relative">
                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search"
                              value={searchNotes}
                              onChange={(e) => setSearchNotes(e.target.value)}
                              className="w-full pl-7 pr-3 py-1 border border-gray-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                            />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                      {loading ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-gray-400 text-sm font-semibold">
                            Loading call logs...
                          </td>
                        </tr>
                      ) : calls.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-gray-400 text-sm font-semibold">
                            No call records found under active filters.
                          </td>
                        </tr>
                      ) : (
                        calls.map((call, index) => {
                          const isIncoming = call.callType === "INCOMING";
                          const isOutgoing = call.callType === "OUTGOING";
                          return (
                            <tr key={call.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="py-4 px-4 font-bold text-gray-600 text-center">{index + 1}</td>
                              <td className="py-4 px-4 font-medium">
                                <p className="text-gray-900 font-semibold">{call.importedBy?.name || "System"}</p>
                                <p className="text-xs text-gray-500 mt-0.5">({call.importedBy?.email.split("@")[0] || "9921640630"})</p>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                  <div>
                                    <p className="font-semibold text-amber-700 hover:underline cursor-pointer">
                                      {call.contactName || "Unknown"}
                                    </p>
                                    <p className="text-xs text-gray-500 font-medium mt-0.5">{call.mobileNumber}</p>
                                  </div>
                                  <button
                                    onClick={() => togglePin(call.id)}
                                    className={`p-1 rounded-md hover:bg-gray-100 transition-colors shrink-0 ${
                                      call.isImportant ? "text-amber-500" : "text-gray-300"
                                    }`}
                                    title={call.isImportant ? "Unpin" : "Pin Call"}
                                  >
                                    <Pin size={13} className={call.isImportant ? "fill-amber-500" : ""} />
                                  </button>
                                </div>
                              </td>
                              <td className="py-4 px-4 font-medium">
                                {new Date(call.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              </td>
                              <td className="py-4 px-4 text-gray-600 font-semibold">
                                {new Date(call.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                              </td>
                              <td className="py-4 px-4 font-semibold text-gray-900">
                                {call.callType === "MISSED" ? "—" : formatHMS(call.duration)}
                              </td>
                              <td className="py-4 px-4">
                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg w-fit text-xs font-bold ${
                                  isIncoming
                                    ? "bg-green-50 text-green-700 border border-green-100"
                                    : isOutgoing
                                    ? "bg-blue-50 text-blue-700 border border-blue-100"
                                    : "bg-red-50 text-red-700 border border-red-100"
                                }`}>
                                  {isIncoming && <PhoneIncoming size={12} />}
                                  {isOutgoing && <PhoneOutgoing size={12} />}
                                  {call.callType === "MISSED" && <PhoneMissed size={12} />}
                                  <span className="capitalize">{call.callType.toLowerCase()}</span>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                {call.notes && call.notes.length > 0 ? (
                                  <p className="text-xs text-gray-600 font-medium">{call.notes[0].content}</p>
                                ) : (
                                  <button className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 transition-colors">
                                    <Plus size={11} />
                                    <span>Add Note</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Summary Tab View ── */}
      {activeTab === "SUMMARY" && (() => {
        const totalCalls = calls.length;
        const connectedCalls = calls.filter(c => c.duration > 0 && c.callType !== "MISSED").length;
        const totalDuration = calls.reduce((acc, c) => acc + (c.callType === "MISSED" ? 0 : c.duration), 0);
        const missedCalls = calls.filter(c => c.callType === "MISSED").length;
        const answeredPercent = totalCalls > 0 ? (connectedCalls / totalCalls) * 100 : 0;
        const missedPercent = totalCalls > 0 ? (missedCalls / totalCalls) * 100 : 0;
        const avgDuration = connectedCalls > 0 ? Math.round(totalDuration / connectedCalls) : 0;

        const pieData = [
          { name: "Incoming", value: calls.filter(c => c.callType === "INCOMING").length, color: "#10b981" },
          { name: "Outgoing", value: calls.filter(c => c.callType === "OUTGOING").length, color: "#3b82f6" },
          { name: "Missed", value: calls.filter(c => c.callType === "MISSED").length, color: "#ef4444" },
        ];

        return (
          <div className="space-y-6 animate-fadeIn">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Total Calls */}
              <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm flex items-center justify-between hover:scale-[1.01] hover:shadow-md transition-all duration-300">
                <div className="space-y-1">
                  <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Total Calls</span>
                  <span className="block text-2xl font-black text-gray-900">{totalCalls}</span>
                  <span className="block text-[10px] text-gray-500 font-medium">Inbound & Outbound</span>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl text-amber-500 border border-amber-100 shrink-0">
                  <Phone size={22} className="stroke-[2.5]" />
                </div>
              </div>

              {/* Card 2: Connected Calls */}
              <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm flex items-center justify-between hover:scale-[1.01] hover:shadow-md transition-all duration-300">
                <div className="space-y-1">
                  <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Connected Calls</span>
                  <span className="block text-2xl font-black text-gray-900">{connectedCalls}</span>
                  <span className="block text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 w-fit">{answeredPercent.toFixed(1)}% Rate</span>
                </div>
                <div className="p-3 bg-sky-50 rounded-xl text-sky-500 border border-sky-100 shrink-0">
                  <Check size={22} className="stroke-[2.5]" />
                </div>
              </div>

              {/* Card 3: Avg Call Duration */}
              <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm flex items-center justify-between hover:scale-[1.01] hover:shadow-md transition-all duration-300">
                <div className="space-y-1">
                  <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Avg Duration</span>
                  <span className="block text-2xl font-black text-gray-900">{formatHMS(avgDuration)}</span>
                  <span className="block text-[10px] text-gray-500 font-medium">For connected calls</span>
                </div>
                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-500 border border-indigo-100 shrink-0">
                  <Clock size={22} className="stroke-[2.5]" />
                </div>
              </div>

              {/* Card 4: Missed Calls */}
              <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm flex items-center justify-between hover:scale-[1.01] hover:shadow-md transition-all duration-300">
                <div className="space-y-1">
                  <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Missed Calls</span>
                  <span className="block text-2xl font-black text-gray-900">{missedCalls}</span>
                  <span className="block text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 w-fit">{missedPercent.toFixed(1)}% Rate</span>
                </div>
                <div className="p-3 bg-red-50 rounded-xl text-red-500 border border-red-100 shrink-0">
                  <AlertCircle size={22} className="stroke-[2.5]" />
                </div>
              </div>

            </div>

            {/* Performance Summary and Statistics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Employee Summary Card */}
              <div className="bg-white rounded-xl border border-gray-150 shadow-sm p-5 lg:col-span-2 space-y-4">
                <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Employee Performance Summary</h3>
                    <p className="text-[11px] text-gray-500">Quick list of active employees and statistics</p>
                  </div>
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">Active</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 uppercase font-bold border-b border-gray-100">
                        <th className="py-2.5 px-3 font-bold">Employee</th>
                        <th className="py-2.5 px-3 font-bold text-center">Total Calls</th>
                        <th className="py-2.5 px-3 font-bold text-center">Connected</th>
                        <th className="py-2.5 px-3 font-bold">Total Duration</th>
                        <th className="py-2.5 px-3 font-bold text-center">Answered Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                      {members.map(m => {
                        const empCalls = calls.filter(c => c.importedBy?.id === m.userId);
                        const empTotal = empCalls.length;
                        const empConnected = empCalls.filter(c => c.duration > 0 && c.callType !== "MISSED").length;
                        const empDuration = empCalls.reduce((acc, c) => acc + (c.callType === "MISSED" ? 0 : c.duration), 0);
                        const efficiency = empTotal > 0 ? (empConnected / empTotal) * 100 : 0;

                        if (empTotal === 0) return null;

                        return (
                          <tr key={m.userId} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-3 px-3 font-semibold text-gray-900">{m.user.name}</td>
                            <td className="py-3 px-3 text-center">{empTotal}</td>
                            <td className="py-3 px-3 text-center text-sky-750 bg-sky-50/10 font-bold">{empConnected}</td>
                            <td className="py-3 px-3 font-bold">{formatHHMMSS(empDuration)}</td>
                            <td className="py-3 px-3">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${efficiency}%` }}></div>
                                </div>
                                <span className="font-bold text-[10px] text-gray-600">{efficiency.toFixed(0)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {calls.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-400 font-semibold">No active call logs found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Call Type Share Pie Chart */}
              <div className="bg-white rounded-xl border border-gray-150 shadow-sm p-5 space-y-4 flex flex-col justify-between">
                <div className="border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Call Type Share</h3>
                  <p className="text-[11px] text-gray-500">Distribution share percentage</p>
                </div>
                <div className="flex items-center justify-center h-[180px] w-full">
                  {totalCalls > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => [`${v} Calls`]} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <span className="text-xs text-gray-400">No Data Available</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  <div className="space-y-1">
                    <span className="block text-emerald-600 font-black text-xs">{calls.filter(c => c.callType === "INCOMING").length}</span>
                    <span>Incoming</span>
                  </div>
                  <div className="space-y-1 border-x border-gray-100">
                    <span className="block text-blue-600 font-black text-xs">{calls.filter(c => c.callType === "OUTGOING").length}</span>
                    <span>Outgoing</span>
                  </div>
                  <div className="space-y-1">
                    <span className="block text-red-600 font-black text-xs">{calls.filter(c => c.callType === "MISSED").length}</span>
                    <span>Missed</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ── Analysis Tab View ── */}
      {activeTab === "ANALYSIS" && (() => {
        const daily: { [dateStr: string]: { date: string, rawDate: Date, incoming: number, outgoing: number, missed: number, total: number } } = {};
        for (const call of calls) {
          const dObj = new Date(call.date);
          const dateStr = dObj.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
          if (!daily[dateStr]) {
            daily[dateStr] = { date: dateStr, rawDate: dObj, incoming: 0, outgoing: 0, missed: 0, total: 0 };
          }
          daily[dateStr].total++;
          if (call.callType === "INCOMING") daily[dateStr].incoming++;
          else if (call.callType === "OUTGOING") daily[dateStr].outgoing++;
          else if (call.callType === "MISSED") daily[dateStr].missed++;
        }
        
        const sortedDaily = Object.values(daily).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

        const empDurationData = members.map(m => {
          const empCalls = calls.filter(c => c.importedBy?.id === m.userId && c.duration > 0 && c.callType !== "MISSED");
          const totalDuration = empCalls.reduce((acc, c) => acc + c.duration, 0);
          const avgDurMin = empCalls.length > 0 ? Math.round((totalDuration / empCalls.length) / 60) : 0;
          return {
            name: m.user.name.split(" ")[0],
            "Avg Talk Time (Min)": avgDurMin
          };
        }).filter(e => e["Avg Talk Time (Min)"] > 0);

        return (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Daily Trends Area Chart */}
            <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-3 gap-2">
                <div>
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Call Volume Trends</h3>
                  <p className="text-[11px] text-gray-500">Day-by-day inbound vs outbound call breakdown</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-emerald-50 rounded-sm"></span>
                    <span className="text-gray-600">Incoming</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-blue-500 rounded-sm"></span>
                    <span className="text-gray-600">Outgoing</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-red-50 rounded-sm"></span>
                    <span className="text-gray-600">Missed</span>
                  </div>
                </div>
              </div>
              <div className="h-[250px] w-full">
                {sortedDaily.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sortedDaily} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorIncoming" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorOutgoing" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="incoming" name="Incoming" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncoming)" />
                      <Area type="monotone" dataKey="outgoing" name="Outgoing" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorOutgoing)" />
                      <Area type="monotone" dataKey="missed" name="Missed" stroke="#ef4444" strokeWidth={1.5} fillOpacity={0} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-gray-400 font-semibold">No data available to display trend</div>
                )}
              </div>
            </div>

            {/* Average Duration by Employee */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Average Talk Time (Minutes)</h3>
                  <p className="text-[11px] text-gray-500">Average call duration comparison per employee</p>
                </div>
                <div className="h-[200px] w-full">
                  {empDurationData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={empDurationData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip formatter={(v) => [`${v} Minutes`]} />
                        <Bar dataKey="Avg Talk Time (Min)" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={30} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-gray-400 font-semibold">No duration data available</div>
                  )}
                </div>
              </div>

              {/* Call Summary Metric Info Card */}
              <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Engagement Insights</h3>
                  <p className="text-[11px] text-gray-500">Key metrics on active communication</p>
                </div>
                <div className="space-y-4 my-4 font-semibold text-xs">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-500">Total Talk Time</span>
                    <span className="text-gray-900 text-sm font-bold">
                      {formatHMS(calls.reduce((acc, c) => acc + (c.callType === "MISSED" ? 0 : c.duration), 0))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-500">Peak Call Volume Day</span>
                    <span className="text-gray-900 text-sm font-bold">
                      {sortedDaily.sort((a,b) => b.total - a.total)[0]?.date || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-500">Peak Hourly Slot</span>
                    <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-black">
                      11:00 AM - 12:00 PM
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-500">Unique Customer Contacts</span>
                    <span className="text-gray-900 text-sm font-bold">
                      {new Set(calls.map(c => c.mobileNumber)).size} clients
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ── Day-wise Analysis Tab View ── */}
      {activeTab === "DAY_WISE" && (() => {
        const daily: { [dateStr: string]: { date: string, rawDate: Date, total: number, connected: number, duration: number, incoming: number, outgoing: number, missed: number } } = {};
        for (const call of calls) {
          const dObj = new Date(call.date);
          const dateStr = dObj.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
          if (!daily[dateStr]) {
            daily[dateStr] = { date: dateStr, rawDate: dObj, total: 0, connected: 0, duration: 0, incoming: 0, outgoing: 0, missed: 0 };
          }
          daily[dateStr].total++;
          if (call.callType === "INCOMING") {
            daily[dateStr].incoming++;
            if (call.duration > 0) {
              daily[dateStr].connected++;
              daily[dateStr].duration += call.duration;
            }
          } else if (call.callType === "OUTGOING") {
            daily[dateStr].outgoing++;
            if (call.duration > 0) {
              daily[dateStr].connected++;
              daily[dateStr].duration += call.duration;
            }
          } else if (call.callType === "MISSED") {
            daily[dateStr].missed++;
          }
        }

        const sortedDaily = Object.values(daily).sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
        const chartData = [...sortedDaily].reverse().map(d => ({
          date: d.date.split(",")[0],
          "Total Calls": d.total,
          "Connected": d.connected,
        }));

        return (
          <div className="space-y-6 animate-fadeIn">
            {/* Day wise Call Trend Chart */}
            <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Daily Call Volume Trend</h3>
                <p className="text-[11px] text-gray-500">Trend of daily total calls vs connected calls</p>
              </div>
              <div className="h-[220px] w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="date" stroke="#9ca3af" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke="#9ca3af" fontSize={9} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="Total Calls" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorCalls)" />
                      <Area type="monotone" dataKey="Connected" stroke="#0ea5e9" strokeWidth={1.5} fillOpacity={0} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-gray-400 font-semibold">No data available for active period</div>
                )}
              </div>
            </div>

            {/* Day wise Stats Table */}
            <div className="bg-white rounded-xl border border-gray-150 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 uppercase font-bold border-b border-gray-100">
                      <th className="py-3 px-4 font-bold">Date</th>
                      <th className="py-3 px-3 font-bold text-center">Total Calls</th>
                      <th className="py-3 px-3 font-bold text-center">Connected Calls</th>
                      <th className="py-3 px-3 font-bold">Total Duration</th>
                      <th className="py-3 px-3 font-bold text-center">Incoming Calls</th>
                      <th className="py-3 px-3 font-bold text-center">Outgoing Calls</th>
                      <th className="py-3 px-3 font-bold text-center">Missed Calls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                    {sortedDaily.map((d, index) => (
                      <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-gray-900">{d.date}</td>
                        <td className="py-3.5 px-3 text-center">{d.total}</td>
                        <td className="py-3.5 px-3 text-center text-sky-700 bg-sky-50/10 font-bold">{d.connected}</td>
                        <td className="py-3.5 px-3 font-bold">{formatHHMMSS(d.duration)}</td>
                        <td className="py-3.5 px-3 text-center text-green-750">{d.incoming}</td>
                        <td className="py-3.5 px-3 text-center text-blue-750">{d.outgoing}</td>
                        <td className="py-3.5 px-3 text-center text-red-750">{d.missed}</td>
                      </tr>
                    ))}
                    {sortedDaily.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-400 font-semibold">No call logs found for selected dates.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        );
      })()}

    </div>
  );
}
