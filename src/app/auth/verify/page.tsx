"use client";
// src/app/auth/verify/page.tsx
// URL: /auth/verify?email=user@example.com

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Phone, CheckCircle, RefreshCw } from "lucide-react";

function VerifyOTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [devOtp, setDevOtp] = useState("");

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  // Redirect if no email
  useEffect(() => {
    if (!email) router.push("/auth/signup");
  }, [email, router]);

  // Check dev OTP from URL (development only)
  useEffect(() => {
    const dev = searchParams.get("devOtp");
    if (dev) setDevOtp(dev);
  }, [searchParams]);

  // =============================================================
  // OTP INPUT HANDLERS
  // =============================================================

  function handleOtpChange(index: number, value: string) {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Only last digit
    setOtp(newOtp);
    setError("");

    // Auto focus next
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit when all filled
    if (value && index === 5) {
      const fullOtp = [...newOtp.slice(0, 5), value.slice(-1)].join("");
      if (fullOtp.length === 6) handleVerify(fullOtp);
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      handleVerify(pasted);
    }
  }

  // =============================================================
  // VERIFY
  // =============================================================

  async function handleVerify(otpValue?: string) {
    const finalOtp = otpValue || otp.join("");
    if (finalOtp.length !== 6) {
      setError("Please enter the complete 6-digit OTP");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/v1/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: finalOtp }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        // Save org id if available
        if (data.data?.organizationId) {
          localStorage.setItem("currentOrgId", data.data.organizationId);
        }
        setTimeout(() => router.push("/dashboard"), 1500);
      } else {
        setError(data.message || "Invalid OTP");
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // =============================================================
  // RESEND
  // =============================================================

  async function handleResend() {
    setResending(true);
    setError("");

    try {
      const res = await fetch("/api/v1/auth/verify-otp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (data.success) {
        if (data.autoVerified) {
          // No SMTP — auto verified
          router.push("/dashboard");
          return;
        }
        // Show Dev OTP
        if (data.devOtp) setDevOtp(data.devOtp);
        setCountdown(60);
        setCanResend(false);
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else {
        setError(data.message || "Failed to resend OTP");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setResending(false);
    }
  }

  // =============================================================
  // SUCCESS STATE
  // =============================================================

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <CheckCircle size={40} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Email Verified!</h1>
          <p className="text-gray-400">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  // =============================================================
  // MAIN RENDER
  // =============================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-500 rounded-xl mb-4">
            <Phone size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Verify Your Email</h1>
          <p className="text-gray-400 text-sm mt-2">
            We sent a 6-digit OTP to
          </p>
          <p className="text-blue-400 font-semibold text-sm">{email}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">

          {/* Dev OTP hint */}
          {devOtp && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-5 text-center">
              <p className="text-xs text-yellow-600 font-medium">Development Mode — OTP:</p>
              <p className="text-2xl font-bold text-yellow-700 font-mono tracking-widest mt-1">
                {devOtp}
              </p>
              <button
                onClick={() => {
                  setOtp(devOtp.split(""));
                  handleVerify(devOtp);
                }}
                className="text-xs text-yellow-600 underline mt-1"
              >
                Click to auto-fill
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-5 text-center">
              {error}
            </div>
          )}

          {/* OTP Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-4 text-center">
              Enter OTP
            </label>
            <div className="flex gap-3 justify-center" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-xl focus:outline-none transition-colors ${
                    digit
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-300 text-gray-900 focus:border-blue-400"
                  }`}
                  autoFocus={index === 0}
                />
              ))}
            </div>
            <p className="text-center text-xs text-gray-400 mt-3">
              OTP expires in 10 minutes
            </p>
          </div>

          {/* Verify Button */}
          <button
            onClick={() => handleVerify()}
            disabled={loading || otp.join("").length !== 6}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Verifying...
              </span>
            ) : (
              "Verify Email"
            )}
          </button>

          {/* Resend */}
          <div className="text-center mt-5">
            {canResend ? (
              <button
                onClick={handleResend}
                disabled={resending}
                className="flex items-center gap-2 mx-auto text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <RefreshCw size={14} className={resending ? "animate-spin" : ""} />
                {resending ? "Sending..." : "Resend OTP"}
              </button>
            ) : (
              <p className="text-sm text-gray-400">
                Resend OTP in{" "}
                <span className="font-semibold text-gray-600">{countdown}s</span>
              </p>
            )}
          </div>

          {/* Back to signup */}
          <div className="text-center mt-4">
            <button
              onClick={() => router.push("/auth/signup")}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              ← Back to Signup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyOTPContent />
    </Suspense>
  );
}
