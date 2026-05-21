"use client";
// src/app/dashboard/layout.tsx
import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { usePathname } from "next/navigation";
import { XOctagon, AlertCircle } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [subscriptionError, setSubscriptionError] = useState<{ error: string; message: string } | null>(null);

  useEffect(() => {
    let active = true;
    
    async function checkBillingStatus() {
      try {
        const r = await fetch("/api/v1/auth/me");
        const data = await r.json();
        if (!active) return;

        if (data.success) {
          const orgId = localStorage.getItem("currentOrgId");
          const orgs = data.data.organizations || [];
          const activeOrg = orgs.find((o: any) => o.id === orgId) || orgs[0];

          if (activeOrg) {
            const isBlocked = activeOrg.status === "BLOCKED" || activeOrg.status === "SUSPENDED";
            const isExpired = activeOrg.subscriptionEndDate && new Date(activeOrg.subscriptionEndDate) < new Date();

            if (isBlocked) {
              setSubscriptionError({
                error: "ORGANIZATION_BLOCKED",
                message: "Your organization account has been suspended due to payment or security issues. Please contact our support team to resolve this as soon as possible.",
              });
            } else if (isExpired) {
              const msg = activeOrg.planType === "FREE_TRIAL"
                ? "Your 7-day free trial has expired. Please purchase the Enterprise Plan to continue using the service."
                : "Your subscription has expired. Please renew the Enterprise Plan to continue using the service.";
              setSubscriptionError({
                error: "SUBSCRIPTION_EXPIRED",
                message: msg,
              });
            } else {
              setSubscriptionError(null);
            }
          }
        }
      } catch (err) {
        console.error("Error loading billing status in layout:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    checkBillingStatus();
    
    return () => {
      active = false;
    };
  }, [pathname]);

  const isBillingPage = pathname === "/settings/billing";
  const shouldBlock = !isBillingPage && subscriptionError;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen w-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (shouldBlock) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center p-6 bg-gray-50/50 backdrop-blur-sm">
        <div className="max-w-xl w-full text-center space-y-6 bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-gray-100 relative overflow-hidden">
          {/* Top glowing decorative bar */}
          <div className={`absolute top-0 left-0 right-0 h-2 ${subscriptionError.error === "ORGANIZATION_BLOCKED" ? "bg-red-500 animate-pulse" : "bg-indigo-600 animate-pulse"}`} />

          {/* Icon Section */}
          <div className="flex justify-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center animate-bounce shadow-lg ${subscriptionError.error === "ORGANIZATION_BLOCKED" ? "bg-red-50 text-red-500 shadow-red-100" : "bg-indigo-50 text-indigo-600 shadow-indigo-100"}`}>
              {subscriptionError.error === "ORGANIZATION_BLOCKED" ? <XOctagon size={40} /> : <AlertCircle size={40} />}
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-3">
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
              {subscriptionError.error === "ORGANIZATION_BLOCKED" ? "Organization Account Suspended" : "Subscription Plan Expired"}
            </h1>
            <p className="text-gray-600 text-sm md:text-base leading-relaxed">
              {subscriptionError.message}
            </p>
          </div>

          {/* Core Premium Features Reminder */}
          {subscriptionError.error === "SUBSCRIPTION_EXPIRED" && (
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 text-left space-y-3">
              <p className="text-xs font-bold text-indigo-900 uppercase tracking-wide">💎 Enterprise Premium Features:</p>
              <ul className="text-xs text-gray-700 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> <strong>Unlimited employees and SIM cards</strong>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> <strong>Unlimited call sync + analytics history</strong>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> <strong>Download call logs in Excel (.xlsx), CSV and PDF</strong>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> <strong>Daily reports and 24/7 priority support</strong>
                </li>
              </ul>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            {subscriptionError.error === "SUBSCRIPTION_EXPIRED" && (
              <a
                href="/settings/billing"
                className="inline-flex items-center justify-center px-8 py-3.5 rounded-2xl font-bold text-white text-sm bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] shadow-indigo-600/10 cursor-pointer"
              >
                Renew Subscription
              </a>
            )}
            <a
              href="mailto:support@calllogsaas.com"
              className={`inline-flex items-center justify-center px-8 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] ${
                subscriptionError.error === "ORGANIZATION_BLOCKED"
                  ? "bg-red-600 hover:bg-red-700 text-white shadow-red-600/10"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
              }`}
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative">
      {/* Sidebar Drawer on mobile / Sidebar permanent on desktop */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Backdrop overlay for mobile drawer */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)} 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
        />
      )}

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
