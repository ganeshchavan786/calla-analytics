"use client";
// src/app/analytics-1/page.tsx — Periodic Reports (Analytics-1)

import { useState, useEffect, useCallback } from "react";
import {
  Calendar, Users, BarChart2, Clock, Activity, FileText, Download,
  Search, ChevronDown, Check, X, Pin, Plus, AlertCircle, ChevronUp, Sliders,
  PhoneIncoming, PhoneOutgoing, PhoneMissed
} from "lucide-react";
import Link from "next/link";

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
  
  // Filter States (Top Bar)
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
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
  }, [orgId, limit, selectedEmployee, selectedCallType, searchEmployee, searchToNumber, searchDate, searchCallType]);

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
                  setFromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
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
        <div className="bg-white rounded-xl border border-gray-150 shadow-sm overflow-hidden">
          
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

          {/* Call History Table */}
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
                        className="w-full pl-7 pr-3 py-1 border border-gray-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none lowercase normal-case bg-white"
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
                        className="w-full pl-7 pr-3 py-1 border border-gray-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none lowercase normal-case bg-white"
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
                        className="w-full pl-7 pr-3 py-1 border border-gray-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none lowercase normal-case bg-white"
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
                        {/* Sr No */}
                        <td className="py-4 px-4 font-bold text-gray-600 text-center">{index + 1}</td>
                        
                        {/* Employee info */}
                        <td className="py-4 px-4 font-medium">
                          <p className="text-gray-900 font-semibold">{call.importedBy?.name || "System"}</p>
                          <p className="text-xs text-gray-500 mt-0.5">({call.importedBy?.email.split("@")[0] || "9921640630"})</p>
                        </td>

                        {/* To Number / Client */}
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

                        {/* Date */}
                        <td className="py-4 px-4 font-medium">
                          {new Date(call.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </td>

                        {/* Time */}
                        <td className="py-4 px-4 text-gray-600 font-semibold">
                          {new Date(call.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                        </td>

                        {/* Duration */}
                        <td className="py-4 px-4 font-semibold text-gray-900">
                          {call.callType === "MISSED" ? "—" : formatHMS(call.duration)}
                        </td>

                        {/* Call Type Badge */}
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

                        {/* Notes */}
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

      {/* ── Placeholder for other tabs ── */}
      {activeTab !== "CALL_HISTORY" && activeTab !== "UNIQUE_CLIENTS" && activeTab !== "NOT_PICKUP" && (
        <div className="bg-white rounded-xl border border-gray-150 p-12 text-center">
          <p className="text-gray-400 text-sm font-semibold">
            {TABS.find((t) => t.id === activeTab)?.label} report module is being configured.
          </p>
        </div>
      )}

    </div>
  );
}
