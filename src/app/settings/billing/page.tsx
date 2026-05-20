"use client";

import { useEffect, useState, useCallback } from "react";
import Script from "next/script";
import { CreditCard, CheckCircle, AlertTriangle, ShieldCheck, Clock, CheckSquare, XCircle } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface OrgData {
  id: string;
  name: string;
  planType: string;
  subscriptionEndDate: string | null;
  status: string;
}

interface MemberData {
  id: string;
}

export default function BillingPage() {
  const [org, setOrg] = useState<OrgData | null>(null);
  const [members, setMembers] = useState<MemberData[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<1 | 3 | 12>(1);

  const orgId = typeof window !== "undefined"
    ? localStorage.getItem("currentOrgId") || ""
    : "";

  const fetchData = useCallback(async () => {
    if (!orgId) return;
    try {
      setLoading(true);
      const [authRes, membersRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch(`/api/v1/organizations/${orgId}/members`)
      ]);
      const authData = await authRes.json();
      const membersData = await membersRes.json();
      
      if (authData.success) {
        const activeOrg = authData.data.organizations.find((o: any) => o.id === orgId);
        if (activeOrg) setOrg(activeOrg);
      }
      if (membersData.success) {
        setMembers(membersData.data);
      }
    } catch (err) {
      console.error("Failed to load billing data", err);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePayment = async () => {
    if (!orgId) return;
    setPaymentLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const PRICE_PER_USER_PER_MONTH = 125;
      const amount = members.length * PRICE_PER_USER_PER_MONTH * selectedPlan;

      // 1. Create Order
      const res = await fetch(`/api/v1/organizations/${orgId}/billing/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planMonths: selectedPlan, memberCount: members.length, amount }),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to create order");
      }

      // 2. Open Razorpay Checkout
      const options = {
        key: data.data.keyId,
        amount: data.data.amount,
        currency: data.data.currency,
        name: "CallLog SaaS",
        description: `${selectedPlan} Month(s) Subscription for ${members.length} Members`,
        order_id: data.data.orderId,
        handler: async function (response: any) {
          try {
            // 3. Verify Payment
            const verifyRes = await fetch(`/api/v1/organizations/${orgId}/billing/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planMonths: selectedPlan,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              setSuccessMsg("Payment successful! Your subscription has been updated.");
              fetchData(); // Refresh data
            } else {
              setErrorMsg(verifyData.message || "Payment verification failed");
            }
          } catch (e: any) {
            setErrorMsg(e.message || "Error verifying payment");
          }
        },
        prefill: {
          name: org?.name || "",
        },
        theme: {
          color: "#4f46e5", // Indigo-600
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        setErrorMsg(`Payment Failed: ${response.error.description}`);
      });
      rzp.open();
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong. Please try again.");
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isExpired = org?.subscriptionEndDate && new Date(org.subscriptionEndDate) < new Date();
  const daysLeft = org?.subscriptionEndDate ? Math.ceil((new Date(org.subscriptionEndDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : 0;
  
  const PRICE_PER_USER_PER_MONTH = 125;
  const totalCost = members.length * PRICE_PER_USER_PER_MONTH * selectedPlan;

  return (
    <>
      <Script id="razorpay-checkout-js" src="https://checkout.razorpay.com/v1/checkout.js" />
      <div className="space-y-6 max-w-4xl mx-auto pb-10">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Plan</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your organization's subscription and billing details.</p>
        </div>

        {/* Status Messages */}
        {errorMsg && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-center gap-3">
            <AlertTriangle size={20} />
            <p className="text-sm font-medium">{errorMsg}</p>
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-200 flex items-center gap-3">
            <CheckCircle size={20} />
            <p className="text-sm font-medium">{successMsg}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Plan Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="text-indigo-600" /> Current Plan
              </h2>
              <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                org?.planType === "FREE_TRIAL" ? "bg-amber-100 text-amber-700" :
                isExpired ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
              }`}>
                {org?.planType?.replace("_", " ")}
              </span>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-500 text-sm">Status</span>
                <span className="font-semibold text-gray-900 flex items-center gap-1">
                  {isExpired ? (
                    <><XCircle size={14} className="text-red-500" /> Expired</>
                  ) : (
                    <><CheckCircle size={14} className="text-emerald-500" /> Active</>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-500 text-sm">Valid Until</span>
                <span className="font-semibold text-gray-900">
                  {org?.subscriptionEndDate ? formatDateTime(org.subscriptionEndDate) : "N/A"}
                  {!isExpired && daysLeft > 0 && <span className="text-xs text-gray-400 ml-2">({daysLeft} days left)</span>}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-500 text-sm">Active Members</span>
                <span className="font-semibold text-gray-900">{members.length}</span>
              </div>
            </div>
          </div>

          {/* Upgrade / Renew Card */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-indigo-900 flex items-center gap-2 mb-4">
              <CreditCard className="text-indigo-600" /> Select Subscription
            </h2>
            
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { months: 1, label: "1 Month" },
                { months: 3, label: "3 Months" },
                { months: 12, label: "1 Year" },
              ].map((plan) => (
                <button
                  key={plan.months}
                  onClick={() => setSelectedPlan(plan.months as any)}
                  className={`py-3 px-2 rounded-xl text-center border-2 transition-all ${
                    selectedPlan === plan.months
                      ? "border-indigo-600 bg-white shadow-md text-indigo-700"
                      : "border-transparent bg-indigo-100/50 text-indigo-600 hover:bg-indigo-100"
                  }`}
                >
                  <div className="text-sm font-bold">{plan.label}</div>
                  <div className="text-xs mt-1 opacity-80">₹{PRICE_PER_USER_PER_MONTH * plan.months}/user</div>
                </button>
              ))}
            </div>

            <div className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-indigo-100">
              <div className="flex justify-between text-sm mb-2 text-gray-600">
                <span>{members.length} Members × ₹{PRICE_PER_USER_PER_MONTH * selectedPlan}</span>
                <span>₹{totalCost}</span>
              </div>
              <div className="flex justify-between font-bold text-lg text-indigo-900 pt-2 border-t border-gray-100">
                <span>Total Amount</span>
                <span>₹{totalCost}</span>
              </div>
            </div>

            <button
              onClick={handlePayment}
              disabled={paymentLoading || members.length === 0}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {paymentLoading ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
              ) : (
                <>💳 Pay with Razorpay (₹{totalCost})</>
              )}
            </button>
            <p className="text-center text-xs text-indigo-400 mt-3 flex justify-center items-center gap-1">
              <ShieldCheck size={12} /> Secure encrypted payment
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
