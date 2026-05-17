"use client";
// src/app/reports/page.tsx

import { useState, useEffect } from "react";
import { FileText, Download, BarChart2, Users, Phone, TrendingUp, Clock, Activity } from "lucide-react";

const REPORT_TYPES = [
  { value: "DAILY", label: "Daily Call Report", icon: Phone, desc: "All calls for a specific date, grouped by type" },
  { value: "EMPLOYEE", label: "Employee Call Report", icon: Users, desc: "Per-member call volume and duration breakdown" },
  { value: "MISSED", label: "Missed Call Report", icon: Phone, desc: "All missed calls with response tracking" },
  { value: "NUMBER_WISE", label: "Number-wise Report", icon: BarChart2, desc: "Activity grouped by unique phone number" },
  { value: "DURATION", label: "Duration Report", icon: Clock, desc: "Long, average, and short call analysis" },
  { value: "PRODUCTIVITY", label: "Productivity Report", icon: TrendingUp, desc: "Calls per hour and per day per user" },
  { value: "TREND", label: "Call Trend Analysis", icon: Activity, desc: "Week-over-week and month-over-month trends" },
  { value: "TEAM", label: "Team Activity Report", icon: Users, desc: "Cross-member call volume comparison" },
  { value: "PEAK_HOUR", label: "Peak Hour Analysis", icon: Clock, desc: "Busiest calling windows by day of week" },
];

export default function ReportsPage() {
  const [selectedType, setSelectedType] = useState("DAILY");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedUser, setSelectedUser] = useState("");
  const [members, setMembers] = useState<any[]>([]);
  const [format, setFormat] = useState<"CSV" | "EXCEL" | "PDF">("CSV");
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<any[] | null>(null);

  const orgId = typeof window !== "undefined" ? localStorage.getItem("currentOrgId") || "" : "";

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

  async function generateReport() {
    setGenerating(true);
    setPreview(null);

    try {
      const params = new URLSearchParams({
        type: selectedType,
        dateFrom,
        dateTo,
        format,
        ...(selectedUser ? { userId: selectedUser } : {}),
      });

      const res = await fetch(`/api/v1/organizations/${orgId}/reports?${params}`);

      if (format === "CSV" || format === "EXCEL") {
        const data = await res.json();
        if (data.success) {
          setPreview(data.data);
        }
      } else {
        // PDF download
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `report_${selectedType}_${dateFrom}_${dateTo}.pdf`;
        a.click();
      }
    } finally {
      setGenerating(false);
    }
  }

  function downloadCSV() {
    if (!preview) return;
    const headers = Object.keys(preview[0] || {}).join(",");
    const rows = preview.map((row) => Object.values(row).join(",")).join("\n");
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report_${selectedType}_${dateFrom}_${dateTo}.csv`;
    a.click();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Generate and export call log reports</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Builder */}
        <div className="space-y-5">
          {/* Report Type */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Report Type</h2>
            <div className="space-y-2">
              {REPORT_TYPES.map((report) => {
                const Icon = report.icon;
                return (
                  <button
                    key={report.value}
                    onClick={() => setSelectedType(report.value)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      selectedType === report.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-transparent hover:border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      selectedType === report.value ? "bg-blue-100" : "bg-gray-100"
                    }`}>
                      <Icon size={14} className={selectedType === report.value ? "text-blue-600" : "text-gray-500"} />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${selectedType === report.value ? "text-blue-900" : "text-gray-900"}`}>
                        {report.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{report.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Config + Preview */}
        <div className="lg:col-span-2 space-y-5">
          {/* Config Panel */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Report Configuration</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Filter by Member (Optional)</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
              >
                <option value="">All Members</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.name} ({m.role.toLowerCase()})
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
              <div className="flex gap-3">
                {(["CSV", "EXCEL", "PDF"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-xl border-2 transition-all ${
                      format === f
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {f === "CSV" ? "📄 CSV" : f === "EXCEL" ? "📊 Excel" : "📋 PDF"}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={generateReport}
              disabled={generating}
              className="w-full mt-5 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText size={16} />
                  Generate Report
                </>
              )}
            </button>
          </div>

          {/* Preview */}
          {preview && preview.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <h3 className="font-semibold text-gray-900">Report Preview</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{preview.length} rows</p>
                </div>
                <button
                  onClick={downloadCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  <Download size={14} />
                  Download CSV
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(preview[0]).map((key) => (
                        <th key={key} className="text-left px-4 py-2.5 font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {preview.slice(0, 20).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {Object.values(row).map((val: any, j) => (
                          <td key={j} className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                            {String(val ?? "—")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 20 && (
                  <p className="px-4 py-3 text-xs text-gray-400 text-center border-t border-gray-50">
                    Showing 20 of {preview.length} rows — download for full data
                  </p>
                )}
              </div>
            </div>
          )}

          {preview && preview.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400">
              <FileText size={32} className="mx-auto mb-3 opacity-30" />
              <p>No data found for the selected period</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
