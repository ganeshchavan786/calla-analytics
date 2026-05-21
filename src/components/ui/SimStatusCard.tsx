"use client";
// =====================================================
// FILE: src/components/ui/SimStatusCard.tsx  (NEW FILE)
// ACTION: Create new file
// PURPOSE: Card displaying SIM registration status
// =====================================================

import { Smartphone, Wifi, WifiOff, Clock } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface SIM {
  simSlot: string;
  phoneNumber: string;
  deviceName: string | null;
  isActive: boolean;
  lastSyncAt: string | null;
  totalSynced: number;
}

interface SimStatusCardProps {
  sims: SIM[];
  showRegisterButton?: boolean;
}

export function SimStatusCard({ sims, showRegisterButton = false }: SimStatusCardProps) {
  const sim1 = sims.find((s) => s.simSlot === "SIM_1");
  const sim2 = sims.find((s) => s.simSlot === "SIM_2");

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Smartphone size={16} className="text-gray-500" />
        <h3 className="font-semibold text-gray-900">Registered SIMs</h3>
      </div>

      <div className="space-y-3">
        {[
          { slot: "SIM_1", label: "SIM 1", data: sim1 },
          { slot: "SIM_2", label: "SIM 2", data: sim2 },
        ].map(({ slot, label, data }) => (
          <div
            key={slot}
            className={`flex items-center gap-4 p-3 rounded-xl border ${
              data?.isActive
                ? "bg-green-50 border-green-200"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            {/* Icon */}
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
              data?.isActive ? "bg-green-100" : "bg-gray-100"
            }`}>
              {data?.isActive
                ? <Wifi size={16} className="text-green-600" />
                : <WifiOff size={16} className="text-gray-400" />
              }
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-900">{label}</p>
                {data?.isActive && (
                  <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-medium">
                    ✅ Syncing
                  </span>
                )}
              </div>

              {data ? (
                <>
                  <p className="text-sm text-gray-700 font-medium">{data.phoneNumber}</p>
                  {data.deviceName && (
                    <p className="text-xs text-gray-400">{data.deviceName}</p>
                  )}
                  {data.lastSyncAt && (
                    <div className="flex items-center gap-1 mt-1">
                      <Clock size={11} className="text-gray-400" />
                      <p className="text-xs text-gray-400">
                        Last sync: {formatDateTime(data.lastSyncAt)}
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-gray-400">
                    Total synced: {data.totalSynced.toLocaleString()} calls
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-400">Not registered</p>
              )}
            </div>

            {/* Status badge */}
            {!data && showRegisterButton && (
              <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                Register via App
              </span>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-3 text-center">
        Use the Mobile App to register SIM cards
      </p>
    </div>
  );
}
