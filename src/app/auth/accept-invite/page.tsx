"use client";
// src/app/auth/accept-invite/page.tsx
// URL: /auth/accept-invite?token=xxxxx

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Phone, CheckCircle, XCircle, Building2, Eye, EyeOff } from "lucide-react";

interface InviteInfo {
  email: string;
  role: string;
  organization: { id: string; name: string; logoUrl: string | null };
  expiresAt: string;
  userExists: boolean;
}

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteError, setInviteError] = useState("");

  const [form, setForm] = useState({ name: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);

  // =============================================================
  // LOAD INVITE INFO
  // =============================================================

  useEffect(() => {
    if (!token) {
      setInviteError("Invalid invitation link");
      setLoadingInvite(false);
      return;
    }

    fetch(`/api/v1/auth/accept-invite?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setInvite(data.data);
        } else {
          setInviteError(data.message || "Invalid invitation");
        }
      })
      .catch(() => setInviteError("Network error"))
      .finally(() => setLoadingInvite(false));
  }, [token]);

  // =============================================================
  // ACCEPT INVITE
  // =============================================================

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/v1/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          // Only send name+password if new user
          ...(invite?.userExists ? {} : { name: form.name, password: form.password }),
        }),
      });

      const data = await res.json();

      if (data.success) {
        if (data.data.organization?.id) {
          localStorage.setItem("currentOrgId", data.data.organization.id);
        }
        setSuccess(true);
        setTimeout(() => router.push("/dashboard"), 2000);
      } else {
        setSubmitError(data.message || "Failed to accept invitation");
      }
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // =============================================================
  // LOADING
  // =============================================================

  if (loadingInvite) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Validating invitation...</p>
        </div>
      </div>
    );
  }

  // =============================================================
  // INVALID INVITE
  // =============================================================

  if (inviteError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <XCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Invitation</h2>
          <p className="text-gray-500 text-sm mb-6">{inviteError}</p>
          <p className="text-gray-400 text-xs">
            Please contact your organization admin for a new invitation link.
          </p>
        </div>
      </div>
    );
  }

  // =============================================================
  // SUCCESS
  // =============================================================

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Welcome to {invite?.organization.name}!
          </h2>
          <p className="text-gray-500 text-sm mb-2">
            You have successfully joined the organization.
          </p>
          <p className="text-gray-400 text-xs">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  // =============================================================
  // MAIN FORM
  // =============================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-500 rounded-xl mb-4">
            <Phone size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">You're Invited!</h1>
          <p className="text-gray-400 text-sm mt-1">Accept your invitation to get started</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">

          {/* Organization Info */}
          {invite && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                  <Building2 size={18} className="text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{invite.organization.name}</p>
                  <p className="text-sm text-gray-500">
                    Joining as <span className="font-medium text-blue-600">{invite.role}</span>
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-200 flex items-center justify-between text-xs text-gray-500">
                <span>Invited email: <span className="font-medium text-gray-700">{invite.email}</span></span>
                <span>Expires: {new Date(invite.expiresAt).toLocaleDateString("en-IN")}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleAccept} className="space-y-4">

            {submitError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                {submitError}
              </div>
            )}

            {/* New user → ask name + password */}
            {invite && !invite.userExists && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Your Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Rahul Sharma"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Create Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      required
                      type={showPass ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-11"
                      placeholder="Min 8 chars, 1 uppercase, 1 number"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Existing user → just confirm */}
            {invite?.userExists && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
                ✓ You already have an account with <strong>{invite.email}</strong>.
                Click below to join the organization.
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Joining...
                </span>
              ) : (
                `Join ${invite?.organization.name || "Organization"} →`
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
