"use client";
// src/app/call-logs/import/page.tsx

import { useState, useRef } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

type Step = "select" | "upload" | "processing" | "done";
type Source = "CSV" | "EXCEL" | "ANDROID_BACKUP";

const SOURCES = [
  { value: "CSV", label: "CSV File", desc: "Standard comma-separated values file", ext: ".csv" },
  { value: "EXCEL", label: "Excel File", desc: "Microsoft Excel .xlsx spreadsheet", ext: ".xlsx" },
  { value: "ANDROID_BACKUP", label: "Android Backup", desc: "Android call log backup CSV", ext: ".csv" },
];

export default function ImportPage() {
  const [step, setStep] = useState<Step>("select");
  const [source, setSource] = useState<Source>("CSV");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const orgId = typeof window !== "undefined" ? localStorage.getItem("currentOrgId") || "" : "";

  async function handleImport() {
    if (!file || !orgId) return;
    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("source", source);

    try {
      setStep("processing");
      const res = await fetch(`/api/v1/organizations/${orgId}/import`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setResult(data.data);
        setStep("done");
      } else {
        setError(data.message || "Import failed");
        setStep("upload");
      }
    } catch {
      setError("Network error. Please try again.");
      setStep("upload");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/call-logs" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Import Call Logs</h1>
          <p className="text-sm text-gray-500">Upload your call log file to import records</p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {["Select Source", "Upload File", "Import"].map((s, i) => {
          const stepMap = ["select", "upload", "processing"];
          const isActive = stepMap.indexOf(step) >= i;
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                {i + 1}
              </div>
              <span className={`text-sm ${isActive ? "text-gray-900 font-medium" : "text-gray-400"}`}>{s}</span>
              {i < 2 && <div className="w-12 h-px bg-gray-200" />}
            </div>
          );
        })}
      </div>

      {/* Step: Select source */}
      {step === "select" && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Choose import source</h2>
          <div className="grid gap-3">
            {SOURCES.map((s) => (
              <button
                key={s.value}
                onClick={() => setSource(s.value as Source)}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-colors ${
                  source === s.value ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <FileText size={20} className={source === s.value ? "text-blue-600 mt-0.5" : "text-gray-400 mt-0.5"} />
                <div>
                  <p className="font-medium text-gray-900">{s.label}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{s.desc}</p>
                  <p className="text-xs text-gray-400 mt-1">Format: {s.ext}</p>
                </div>
                {source === s.value && (
                  <CheckCircle size={18} className="text-blue-600 ml-auto mt-0.5 shrink-0" />
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep("upload")}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Continue
          </button>
        </div>
      )}

      {/* Step: Upload */}
      {step === "upload" && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Upload your {source} file</h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              file ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <Upload size={32} className={`mx-auto mb-3 ${file ? "text-blue-500" : "text-gray-400"}`} />
            {file ? (
              <div>
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 font-medium">Click to upload or drag & drop</p>
                <p className="text-sm text-gray-400 mt-1">Max file size: 20MB</p>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept={source === "EXCEL" ? ".xlsx,.xls" : ".csv"}
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          {/* Column mapping hint */}
          <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-500 space-y-1">
            <p className="font-semibold text-gray-700 text-sm mb-2">Expected columns</p>
            <div className="grid grid-cols-2 gap-1">
              {["Mobile Number", "Contact Name", "Call Type", "Date", "Duration (sec)", "SIM Slot", "Device Name", "Notes"].map((col) => (
                <span key={col} className="bg-white rounded px-2 py-1 border border-gray-200">{col}</span>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("select")}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleImport}
              disabled={!file || uploading}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Import Now
            </button>
          </div>
        </div>
      )}

      {/* Step: Processing */}
      {step === "processing" && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-semibold text-gray-900">Processing your file...</p>
          <p className="text-sm text-gray-500">Parsing and importing call records. Please wait.</p>
        </div>
      )}

      {/* Step: Done */}
      {step === "done" && result && (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center space-y-4">
          <CheckCircle size={48} className="text-green-500 mx-auto" />
          <h2 className="text-xl font-bold text-gray-900">Import Complete!</h2>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-gray-900">{result.totalRows}</p>
              <p className="text-xs text-gray-500 mt-1">Total Rows</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-green-600">{result.successRows}</p>
              <p className="text-xs text-gray-500 mt-1">Imported</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-red-600">{result.failedRows}</p>
              <p className="text-xs text-gray-500 mt-1">Failed</p>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setStep("select"); setFile(null); setResult(null); }}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Import More
            </button>
            <Link
              href="/call-logs"
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium text-center hover:bg-blue-700 transition-colors text-sm"
            >
              View Call Logs
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
