// src/app/license/layout.tsx
// Completely isolated layout — no Sidebar, no TopBar from main app

export default function LicenseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950">
      {children}
    </div>
  );
}
