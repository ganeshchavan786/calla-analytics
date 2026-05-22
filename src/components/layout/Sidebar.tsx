"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Phone, BarChart2, FileText, CheckSquare, Bell,
  Settings, LogOut, ChevronDown, Building2, Upload,
  Home, Users, Activity, X, CreditCard
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/call-logs", icon: Phone, label: "Call Logs" },
  { href: "/analytics-1", icon: BarChart2, label: "Analytics-1" },
  { href: "/reports", icon: FileText, label: "Reports" },
  { href: "/tasks", icon: CheckSquare, label: "Follow-up Tasks" },
  { href: "/notifications", icon: Bell, label: "Notifications" },
  { href: "/activity", icon: Activity, label: "Activity Log" },
  { href: "/settings/members", icon: Users, label: "Team Members" },
  { href: "/settings/billing", icon: CreditCard, label: "Billing & Plan" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [orgName, setOrgName] = useState("My Organization");

  useEffect(() => {
    fetch("/api/v1/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setUser(data.data.user);
          const orgId = localStorage.getItem("currentOrgId");
          const orgs = data.data.organizations || [];
          const activeOrg = orgs.find((o: any) => o.id === orgId) || orgs[0];
          if (activeOrg) {
            setOrgName(activeOrg.name);
          }
        }
      })
      .catch((err) => console.error("Failed to load user info in sidebar", err));
  }, []);

  return (
    <aside className={cn(
      "w-64 bg-gray-900 text-white flex flex-col h-full shrink-0 transition-transform duration-300 ease-in-out z-50",
      "fixed inset-y-0 left-0 md:relative md:translate-x-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <Phone size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-gray-900">CallLog</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
            title="Close Menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Org Switcher */}
      <div className="px-4 py-3 border-b border-gray-800">
        <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 size={14} className="text-gray-400 shrink-0" />
            <span className="truncate text-gray-200">{orgName}</span>
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
              onClick={onClose}
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
        <Link href="/settings/profile" onClick={onClose} className="flex items-center gap-3 mb-3 p-1.5 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer min-w-0">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white shrink-0 uppercase">
            {user ? user.name.charAt(0) : "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{user ? user.name : "Loading..."}</p>
            <p className="text-xs text-gray-400 truncate">{user ? user.email : "..."}</p>
          </div>
        </Link>
        <button
          onClick={async () => {
            await fetch("/api/v1/auth/logout", { method: "POST" });
            window.location.href = "/";
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
