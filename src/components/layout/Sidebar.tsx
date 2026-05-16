"use client";
// src/components/layout/Sidebar.tsx

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Phone, BarChart2, FileText, CheckSquare, Bell,
  Settings, LogOut, ChevronDown, Building2, Upload,
  Home, Users, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/call-logs", icon: Phone, label: "Call Logs" },
  { href: "/call-logs/import", icon: Upload, label: "Import" },
  { href: "/analytics", icon: BarChart2, label: "Analytics" },
  { href: "/reports", icon: FileText, label: "Reports" },
  { href: "/tasks", icon: CheckSquare, label: "Follow-up Tasks" },
  { href: "/notifications", icon: Bell, label: "Notifications" },
  { href: "/activity", icon: Activity, label: "Activity Log" },
  { href: "/settings/members", icon: Users, label: "Team Members" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
          <Phone size={16} className="text-white" />
        </div>
        <span className="font-bold text-lg tracking-tight">CallLog</span>
      </div>

      {/* Org Switcher */}
      <div className="px-4 py-3 border-b border-gray-800">
        <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 size={14} className="text-gray-400 shrink-0" />
            <span className="truncate text-gray-200">My Organization</span>
          </div>
          <ChevronDown size={14} className="text-gray-400 shrink-0" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="px-4 py-4 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">
            U
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">User Name</p>
            <p className="text-xs text-gray-400 truncate">user@example.com</p>
          </div>
        </div>
        <button
          onClick={async () => {
            await fetch("/api/v1/auth/logout", { method: "POST" });
            window.location.href = "/auth/login";
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <LogOut size={14} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
