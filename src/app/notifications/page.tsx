"use client";
// src/app/notifications/page.tsx

import { useEffect, useState } from "react";
import { Bell, CheckCheck, Phone, Upload, CheckSquare, User } from "lucide-react";
import { formatDateTime, cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, any> = {
  MISSED_CALL: Phone,
  IMPORT_COMPLETED: Upload,
  IMPORT_FAILED: Upload,
  TASK_ASSIGNED: CheckSquare,
  TASK_DUE_SOON: CheckSquare,
  COMMENT_ADDED: Bell,
  USER_INVITED: User,
  MENTION: Bell,
};

const TYPE_COLORS: Record<string, string> = {
  MISSED_CALL: "bg-red-100 text-red-600",
  IMPORT_COMPLETED: "bg-green-100 text-green-600",
  IMPORT_FAILED: "bg-red-100 text-red-600",
  TASK_ASSIGNED: "bg-blue-100 text-blue-600",
  TASK_DUE_SOON: "bg-orange-100 text-orange-600",
  COMMENT_ADDED: "bg-purple-100 text-purple-600",
  USER_INVITED: "bg-indigo-100 text-indigo-600",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const orgId = typeof window !== "undefined" ? localStorage.getItem("currentOrgId") || "" : "";

  useEffect(() => {
    if (orgId) fetchNotifications();
  }, [orgId]);

  async function fetchNotifications(append = false) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "25" });
      if (append && cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/v1/organizations/${orgId}/notifications?${params}`);
      const data = await res.json();

      if (data.success) {
        if (append) {
          setNotifications((prev) => [...prev, ...data.data.data]);
        } else {
          setNotifications(data.data.data);
        }
        setUnreadCount(data.data.unreadCount);
        setCursor(data.data.nextCursor);
        setHasMore(data.data.hasMore);
      }
    } finally {
      setLoading(false);
    }
  }

  async function markAllRead() {
    await fetch(`/api/v1/organizations/${orgId}/notifications`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  async function markOneRead(id: string) {
    await fetch(`/api/v1/organizations/${orgId}/notifications`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  // Group by date
  const grouped = notifications.reduce<Record<string, Notification[]>>((acc, n) => {
    const date = new Date(n.createdAt).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(n);
    return acc;
  }, {});

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <CheckCheck size={15} />
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications */}
      {loading && notifications.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-16 text-center">
          <Bell size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 font-medium">No notifications yet</p>
          <p className="text-gray-300 text-sm mt-1">You&apos;ll be notified about missed calls, imports, and task updates</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                {date === new Date().toDateString() ? "Today" : date}
              </p>
              <div className="space-y-2">
                {items.map((notif) => {
                  const Icon = TYPE_ICONS[notif.type] || Bell;
                  const iconColor = TYPE_COLORS[notif.type] || "bg-gray-100 text-gray-600";

                  return (
                    <div
                      key={notif.id}
                      onClick={() => !notif.isRead && markOneRead(notif.id)}
                      className={cn(
                        "flex gap-4 p-4 rounded-xl border transition-all cursor-pointer",
                        notif.isRead
                          ? "bg-white border-gray-100"
                          : "bg-blue-50 border-blue-100 hover:bg-blue-50/70"
                      )}
                    >
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", iconColor)}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn("text-sm font-semibold", notif.isRead ? "text-gray-700" : "text-gray-900")}>
                            {notif.title}
                          </p>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-gray-400">{formatDateTime(notif.createdAt)}</span>
                            {!notif.isRead && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{notif.body}</p>
                        {notif.link && (
                          <a
                            href={notif.link}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                          >
                            View →
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {hasMore && (
            <button
              onClick={() => fetchNotifications(true)}
              disabled={loading}
              className="w-full py-3 text-sm text-blue-600 hover:bg-blue-50 rounded-xl border border-gray-100 bg-white transition-colors disabled:opacity-50"
            >
              {loading ? "Loading..." : "Load more notifications"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
