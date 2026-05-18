"use client";
// src/components/layout/TopBar.tsx

import { Bell, Search } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";

export function TopBar() {
  const [search, setSearch] = useState("");
  const [user, setUser] = useState<{ name: string } | null>(null);

  useEffect(() => {
    fetch("/api/v1/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setUser(data.data.user);
        }
      })
      .catch((err) => console.error("Failed to load user info in topbar", err));
  }, []);

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      {/* Search */}
      <div className="relative w-96">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search calls, contacts..."
          className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <Link
          href="/notifications"
          className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
          title="Notifications"
        >
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </Link>
        <Link
          href="/settings/profile"
          className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center text-white text-xs font-bold cursor-pointer transition-colors uppercase select-none"
          title="My Profile"
        >
          {user ? user.name.charAt(0) : "U"}
        </Link>
      </div>
    </header>
  );
}
