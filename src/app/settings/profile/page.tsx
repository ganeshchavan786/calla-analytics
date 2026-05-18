"use client";
// src/app/settings/profile/page.tsx

import { useEffect, useState } from "react";
import { User, Mail, Shield, Smartphone, Key, Calendar, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
  uniqueCode: string | null;
  codeType: string | null;
}

interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface SIMInfo {
  simSlot: string;
  phoneNumber: string;
  deviceName: string | null;
  isActive: boolean;
  lastSyncAt: string | null;
  totalSynced: number;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organizations, setOrganizations] = useState<OrgInfo[]>([]);
  const [sims, setSims] = useState<SIMInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setProfile(data.data.user);
          setOrganizations(data.data.organizations || []);
          setSims(data.data.registeredSIMs || []);
        }
      })
      .catch((err) => console.error("Failed to load profile", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center font-medium">
        Failed to load profile details. Please log in again.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your personal information and view registered devices</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: Avatar Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col items-center text-center shadow-sm h-fit">
          <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-3xl font-bold text-white mb-4 uppercase">
            {profile.name.charAt(0)}
          </div>
          <h2 className="text-xl font-bold text-gray-900">{profile.name}</h2>
          <p className="text-sm text-gray-500 mt-1">{profile.email}</p>

          <div className="w-full border-t border-gray-100 my-4" />

          <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
            <Shield size={12} />
            {profile.codeType || "MEMBER"}
          </div>
        </div>

        {/* Right Side: Details & Registered SIMs */}
        <div className="md:col-span-2 space-y-6">
          {/* Details Card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Account Details</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <User className="text-gray-400 shrink-0" size={18} />
                <div>
                  <p className="text-xs text-gray-500">Full Name</p>
                  <p className="text-sm font-medium text-gray-900">{profile.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Mail className="text-gray-400 shrink-0" size={18} />
                <div>
                  <p className="text-xs text-gray-500">Email Address</p>
                  <p className="text-sm font-medium text-gray-900 break-all">{profile.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Key className="text-gray-400 shrink-0" size={18} />
                <div>
                  <p className="text-xs text-gray-500">Unique Code (Unique ID)</p>
                  <p className="text-sm font-bold text-blue-600">{profile.uniqueCode || "—"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Calendar className="text-gray-400 shrink-0" size={18} />
                <div>
                  <p className="text-xs text-gray-500">Joined On</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(profile.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Active Organizations */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">My Organization</h3>
            <div className="space-y-3">
              {organizations.map((org) => (
                <div key={org.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{org.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Slug: {org.slug}</p>
                  </div>
                  <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded-full uppercase">
                    {org.role}
                  </span>
                </div>
              ))}
              {organizations.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No organizations joined.</p>
              )}
            </div>
          </div>

          {/* Registered SIMs / Devices */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Registered Devices (SIM Cards)</h3>
              <span className="text-xs text-gray-500">{sims.length} active SIMs</span>
            </div>

            <div className="space-y-3">
              {sims.map((sim, index) => (
                <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-100 rounded-xl gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                      <Smartphone size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{sim.phoneNumber}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Slot: <span className="font-medium text-gray-700">{sim.simSlot.replace("_", " ")}</span> | Device: <span className="font-medium text-gray-700">{sim.deviceName || "Unknown"}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <RefreshCw size={10} className="text-gray-400 animate-spin-slow" />
                        Last Sync
                      </p>
                      <p className="text-xs font-medium text-gray-700 mt-0.5">
                        {sim.lastSyncAt
                          ? new Date(sim.lastSyncAt).toLocaleString("en-IN")
                          : "Never"}
                      </p>
                    </div>

                    <span className={cn(
                      "px-2.5 py-1 text-xs font-semibold rounded-full uppercase",
                      sim.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    )}>
                      {sim.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              ))}

              {sims.length === 0 && (
                <div className="text-center py-6 text-gray-400">
                  <Smartphone size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No registered SIM cards or devices found.</p>
                  <p className="text-xs mt-1">Install the Android App and sign in with your Unique Code to sync call logs.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
