"use client";
// src/app/activity/page.tsx

import { useEffect, useState } from "react";
import { Activity, Phone, Upload, User, Tag, CheckSquare, Settings } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, any>;
  ipAddress: string | null;
  timestamp: string;
  actor: { id: string; name: string; email: string; avatarUrl: string | null };
}

const ACTION_ICONS: Record<string, any> = {
  call_imported: Upload,
  call_manually_added: Phone,
  call_edited: Phone,
  call_deleted: Phone,
  note_added: Activity,
  tag_created: Tag,
  tag_applied: Tag,
  task_created: CheckSquare,
  task_updated: CheckSquare,
  task_status_changed: CheckSquare,
  user_invited: User,
  user_joined: User,
  user_removed: User,
  settings_changed: Settings,
  import_completed: Upload,
  import_failed: Upload,
};

const ACTION_COLORS: Record<string, string> = {
  call_imported: "bg-blue-100 text-blue-600",
  call_manually_added: "bg-green-100 text-green-600",
  call_deleted: "bg-red-100 text-red-600",
  task_created: "bg-purple-100 text-purple-600",
  task_status_changed: "bg-indigo-100 text-indigo-600",
  user_invited: "bg-orange-100 text-orange-600",
  user_removed: "bg-red-100 text-red-600",
  import_completed: "bg-green-100 text-green-600",
  import_failed: "bg-red-100 text-red-600",
};

function formatAction(action: string): string {
  return action
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const orgId = typeof window !== "undefined" ? localStorage.getItem("currentOrgId") || "" : "";

  useEffect(() => {
    if (orgId) fetchLogs();
  }, [orgId]);

  async function fetchLogs(append = false) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (append && cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/v1/organizations/${orgId}/audit-logs?${params}`);
      const data = await res.json();

      if (data.success) {
        if (append) {
          setLogs((prev) => [...prev, ...data.data.data]);
        } else {
          setLogs(data.data.data);
        }
        setCursor(data.data.nextCursor);
        setHasMore(data.data.hasMore);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
        <p className="text-sm text-gray-500 mt-0.5">Complete audit trail of all actions in your organization</p>
      </div>

      {/* Log list */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-5 py-4 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                </div>
                <div className="h-3 bg-gray-100 rounded w-20" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center">
            <Activity size={40} className="mx-auto mb-3 text-gray-200" />
            <p className="text-gray-400">No activity recorded yet</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-50">
              {logs.map((log) => {
                const Icon = ACTION_ICONS[log.action] || Activity;
                const iconColor = ACTION_COLORS[log.action] || "bg-gray-100 text-gray-600";

                return (
                  <div key={log.id} className="flex gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${iconColor}`}>
                      <Icon size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className="font-semibold text-sm text-gray-900">{log.actor.name}</span>
                          <span className="text-sm text-gray-500 mx-1">·</span>
                          <span className="text-sm text-gray-700">{formatAction(log.action)}</span>
                          <span className="ml-2 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {log.entityType}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                          {formatDateTime(log.timestamp)}
                        </span>
                      </div>

                      {/* Metadata */}
                      {Object.keys(log.metadata).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-2">
                          {Object.entries(log.metadata).slice(0, 4).map(([key, val]) => (
                            <span key={key} className="text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
                              {key}: <span className="font-medium text-gray-700">{String(val)}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-gray-400 mt-1">{log.actor.email}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <div className="px-5 py-4 border-t border-gray-100 text-center">
                <button
                  onClick={() => fetchLogs(true)}
                  disabled={loading}
                  className="px-6 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
