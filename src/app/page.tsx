// src/app/page.tsx — FINAL
import { cookies } from "next/headers";
import Link from "next/link";
import { Phone, ArrowRight, Smartphone, BarChart3, Users, FileText, Check, ShieldCheck, Zap } from "lucide-react";

export const dynamic = "force-dynamic";

export default function RootPage() {
  const cookieStore = cookies();
  const token = cookieStore.get("calllog_session")?.value;

  const features = [
    {
      icon: Smartphone,
      title: "Automatic Mobile Sync",
      desc: "Our secure Android companion app automatically syncs incoming, outgoing, and missed calls directly in the background.",
    },
    {
      icon: BarChart3,
      title: "Real-time Call Analytics",
      desc: "Monitor call volumes, peak calling hours, and duration metrics with elegant interactive charts and heatmaps.",
    },
    {
      icon: Users,
      title: "Multi-SIM & Team Tracking",
      desc: "Filter call logs by individual SIM slots (SIM 1/2) and track sync statuses across all employees from a single portal.",
    },
    {
      icon: FileText,
      title: "Custom PDF & CSV Reports",
      desc: "Filter logs by custom employee, call type, or date range and export up to 5,000 logs instantly with one click.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900 font-sans antialiased">
      {/* ── Navigation Header ── */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-gray-100 px-6 py-4 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
              <Phone size={18} className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-900">CallLog</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a>
            <a href="#security" className="hover:text-blue-600 transition-colors">Security</a>
          </nav>

          <div className="flex items-center gap-3">
            {token ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-500/10 hover:shadow-blue-500/20"
              >
                Go to Dashboard
                <ArrowRight size={14} />
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-blue-600 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-500/10"
                >
                  Start Free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="relative pt-20 pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Hero Content */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100">
              <Zap size={12} className="fill-current animate-pulse" />
              Real-time Call Analytics & Management Platform
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight">
              Transform Call Logs Into <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Business Intelligence</span>
            </h1>

            <p className="text-lg text-gray-500 max-w-xl font-normal leading-relaxed">
              Seamlessly sync call records from your sales & support teams' Android devices, track employee SIM slots, and analyze engagement with beautiful live dashboards.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              {token ? (
                <Link
                  href="/dashboard"
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/20 hover:scale-[1.02]"
                >
                  Open Live Dashboard
                  <ArrowRight size={18} />
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/signup"
                    className="flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/20 hover:scale-[1.02]"
                  >
                    Start 14-Day Free Trial
                    <ArrowRight size={18} />
                  </Link>
                  <Link
                    href="/auth/login"
                    className="flex items-center justify-center px-8 py-4 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-2xl font-bold transition-all"
                  >
                    Explore Product Demo
                  </Link>
                </>
              )}
            </div>

            <div className="flex items-center gap-6 pt-4 text-xs font-medium text-gray-400">
              <span className="flex items-center gap-1.5"><Check size={14} className="text-green-500" /> No Credit Card Required</span>
              <span className="flex items-center gap-1.5"><Check size={14} className="text-green-500" /> Instant Android Sync</span>
              <span className="flex items-center gap-1.5"><Check size={14} className="text-green-500" /> Secure Encryption</span>
            </div>
          </div>

          {/* Hero Visual Mockup */}
          <div className="lg:col-span-5 relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-3xl opacity-10 blur-2xl z-0" />
            <div className="relative bg-white border border-gray-100 rounded-3xl shadow-2xl p-6 z-10 space-y-6">
              {/* Analytics Preview widget */}
              <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase">Today's Call volume</p>
                  <h3 className="text-3xl font-extrabold text-gray-900 mt-1">1,280 Calls</h3>
                </div>
                <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                  <Zap size={18} />
                </div>
              </div>

              {/* SIM Stats preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 text-xs font-bold font-mono">SIM 1</div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">Airtel Corporate</p>
                      <p className="text-[10px] text-gray-400">Syncing active · 9821640630</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-green-100 text-green-800 text-[10px] font-semibold rounded-full uppercase">Syncing</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 text-xs font-bold font-mono">SIM 2</div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">Jio Support Line</p>
                      <p className="text-[10px] text-gray-400">Syncing active · 9987654321</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-green-100 text-green-800 text-[10px] font-semibold rounded-full uppercase">Syncing</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Section ── */}
      <section id="features" className="py-24 bg-gray-50 border-y border-gray-100 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-12">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Engineered for Comprehensive Call Analysis
            </h2>
            <p className="text-lg text-gray-500 font-normal">
              Empower your tele-sales, customer service, and support teams with modern, automated call logging.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left max-w-5xl mx-auto">
            {features.map((feat, index) => {
              const Icon = feat.icon;
              return (
                <div key={index} className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                    <Icon size={24} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-lg text-gray-900">{feat.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Security Section ── */}
      <section id="security" className="py-20 scroll-mt-20">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            Enterprise-Grade Privacy & Security
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            All call log data is fully encrypted inside our system. The CallLog companion app only tracks metadata (call durations, numbers, sim slots) to provide rich analytics, ensuring absolute customer data protection.
          </p>
        </div>
      </section>

      {/* ── Pricing Section ── */}
      <section id="pricing" className="py-24 bg-gray-50 border-t border-gray-100 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-12">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Simple, Scaling-Ready Plans
            </h2>
            <p className="text-lg text-gray-500 font-normal">
              Get started for free today and upgrade as your calling operations grow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto text-left">
            {/* Free Tier */}
            <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm space-y-6 relative flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900">14-Day Free Trial</h3>
                <p className="text-sm text-gray-400">Perfect to explore CallLog features and sync call logs from a single test device.</p>
                <div className="text-4xl font-extrabold text-gray-900">Free</div>
                <div className="w-full border-t border-gray-100" />
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-center gap-2.5"><Check size={16} className="text-green-500" /> 1 Syncing Android Device</li>
                  <li className="flex items-center gap-2.5"><Check size={16} className="text-green-500" /> Basic Call Analytics</li>
                  <li className="flex items-center gap-2.5"><Check size={16} className="text-green-500" /> 14 Days History</li>
                </ul>
              </div>
              <Link
                href="/auth/signup"
                className="w-full block py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-center font-semibold rounded-xl transition-colors mt-6"
              >
                Sign Up Now
              </Link>
            </div>

            {/* Paid Tier */}
            <div className="bg-white rounded-3xl border-2 border-blue-600 p-8 shadow-md space-y-6 relative flex flex-col justify-between">
              <div className="absolute top-0 right-6 -translate-y-1/2 px-3 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">Most Popular</div>
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900">Professional SaaS</h3>
                <p className="text-sm text-gray-400">For business owners to monitor multiple employee mobile lines and dual-SIM slots.</p>
                <div className="text-4xl font-extrabold text-gray-900">Custom Billing</div>
                <div className="w-full border-t border-gray-100" />
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-center gap-2.5"><Check size={16} className="text-blue-600" /> Unlimited Android Devices</li>
                  <li className="flex items-center gap-2.5"><Check size={16} className="text-blue-600" /> Advanced Trend Line Graphs</li>
                  <li className="flex items-center gap-2.5"><Check size={16} className="text-blue-600" /> Multi-SIM Filtering & Tracking</li>
                  <li className="flex items-center gap-2.5"><Check size={16} className="text-blue-600" /> Quick CSV Exporting</li>
                  <li className="flex items-center gap-2.5"><Check size={16} className="text-blue-600" /> Unlimited call log history</li>
                </ul>
              </div>
              <Link
                href="/auth/signup"
                className="w-full block py-3 bg-blue-600 hover:bg-blue-700 text-white text-center font-semibold rounded-xl transition-colors mt-6"
              >
                Start Premium Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer Section ── */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-6 border-t border-gray-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Phone size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg text-white">CallLog</span>
          </div>

          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} CallLog SaaS. All rights reserved.
          </p>

          <p className="text-xs text-gray-500 font-medium">
            Proudly Powered by <span className="text-gray-300">Vrushali Infotech</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
