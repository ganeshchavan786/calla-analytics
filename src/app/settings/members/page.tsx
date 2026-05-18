"use client";
// src/app/settings/members/page.tsx

import { useEffect, useState } from "react";
import { Users, Mail, Plus, Trash2, Shield } from "lucide-react";

interface SIM {
  simSlot: string;
  phoneNumber: string;
  deviceName: string | null;
  isActive: boolean;
  lastSyncAt: string | null;
  totalSynced: number;
}

interface Member {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    uniqueCode?: string | null;
    codeType?: string | null;
    registeredSIMs?: SIM[];
  };
}

const ROLE_BADGES: Record<string, string> = {
  OWNER: "bg-purple-100 text-purple-700",
  ADMIN: "bg-blue-100 text-blue-700",
  MEMBER: "bg-green-100 text-green-700",
  GUEST: "bg-gray-100 text-gray-600",
};

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [invite, setInvite] = useState({ email: "", role: "MEMBER" });
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  const orgId = typeof window !== "undefined" ? localStorage.getItem("currentOrgId") || "" : "";

  useEffect(() => {
    if (orgId) fetchMembers();
  }, [orgId]);

  async function fetchMembers() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/members`);
      const data = await res.json();
      if (data.success) setMembers(data.data);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess("");
    setInviting(true);

    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invite),
      });
      const data = await res.json();

      if (data.success) {
        setInviteSuccess(`Invitation sent to ${invite.email}`);
        setInvite({ email: "", role: "MEMBER" });
      } else {
        setInviteError(data.message || "Failed to send invitation");
      }
    } finally {
      setInviting(false);
    }
  }

  async function updateRole(userId: string, role: string) {
    await fetch(`/api/v1/organizations/${orgId}/members/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    fetchMembers();
  }

  async function removeMember(userId: string) {
    if (!confirm("Are you sure you want to remove this member?")) return;
    await fetch(`/api/v1/organizations/${orgId}/members/${userId}`, {
      method: "DELETE",
    });
    fetchMembers();
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
          <p className="text-sm text-gray-500 mt-0.5">{members.length} members in your organization</p>
        </div>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={15} />
          Invite Member
        </button>
      </div>

      {/* Invite Form */}
      {showInvite && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
            <Mail size={16} />
            Invite a New Member
          </h3>

          {inviteError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm mb-3">
              {inviteError}
            </div>
          )}
          {inviteSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-2 text-sm mb-3">
              ✅ {inviteSuccess}
            </div>
          )}

          <form onSubmit={handleInvite} className="flex gap-3">
            <input
              type="email"
              required
              placeholder="colleague@company.com"
              value={invite.email}
              onChange={(e) => setInvite((i) => ({ ...i, email: e.target.value }))}
              className="flex-1 px-3 py-2.5 border border-blue-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={invite.role}
              onChange={(e) => setInvite((i) => ({ ...i, role: e.target.value }))}
              className="px-3 py-2.5 border border-blue-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {["ADMIN", "MEMBER", "GUEST"].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
            >
              {inviting ? "Sending..." : "Send Invite"}
            </button>
          </form>

          <p className="text-xs text-blue-600 mt-3">
            An invitation link will be sent to their email. It expires in 7 days.
          </p>
        </div>
      )}

      {/* Role Legend */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Shield size={15} />
          Role Permissions
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {[
            { role: "OWNER", perms: "Full access, delete org" },
            { role: "ADMIN", perms: "Invite/remove, export, audit" },
            { role: "MEMBER", perms: "Import, notes, tasks" },
            { role: "GUEST", perms: "View assigned only" },
          ].map((r) => (
            <div key={r.role} className={`px-3 py-2 rounded-lg ${ROLE_BADGES[r.role]}`}>
              <p className="font-bold">{r.role}</p>
              <p className="opacity-75 mt-0.5">{r.perms}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Members List */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users size={16} />
            All Members
          </h2>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-50">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600 shrink-0">
                  {member.user.name[0].toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">{member.user.name}</p>
                    {member.user.uniqueCode && (
                      <span className="text-[10px] bg-purple-50 text-purple-700 font-bold border border-purple-100 px-2 py-0.5 rounded-full font-mono">
                        {member.user.uniqueCode}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{member.user.email}</p>
                  
                  {/* SIM Sync Status Badges */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {!member.user.registeredSIMs || member.user.registeredSIMs.length === 0 ? (
                      <span className="text-[9px] bg-amber-50 text-amber-700 font-bold border border-amber-150 px-2 py-0.5 rounded-md flex items-center gap-1">
                        ⏳ SIM Sync Pending
                      </span>
                    ) : (
                      member.user.registeredSIMs.map((sim) => (
                        <span
                          key={sim.simSlot}
                          className="text-[9px] bg-green-50 text-green-700 font-bold border border-green-150 px-2 py-0.5 rounded-md flex items-center gap-1"
                        >
                          🟢 {sim.simSlot.replace("_", " ")}: {sim.phoneNumber} {sim.deviceName ? `(${sim.deviceName})` : ""}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Role */}
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_BADGES[member.role]}`}>
                  {member.role}
                </span>

                {/* Actions (not for OWNER) */}
                {member.role !== "OWNER" && (
                  <div className="flex items-center gap-2">
                    <select
                      value={member.role}
                      onChange={(e) => updateRole(member.user.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {["ADMIN", "MEMBER", "GUEST"].map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeMember(member.user.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove member"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
