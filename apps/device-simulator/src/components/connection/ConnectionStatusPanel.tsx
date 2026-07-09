"use client";

import { StatusBadge } from "@/components/StatusBadge";
import type { DeviceRecord } from "@/types/device";

export function ConnectionStatusPanel({
  connectionStatus,
  device,
}: {
  connectionStatus: string;
  device: DeviceRecord | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 sm:grid-cols-3">
      <div>
        <p className="text-xs text-neutral-500">Connection Status</p>
        <div className="mt-1">
          <StatusBadge label={connectionStatus} />
        </div>
      </div>
      <div>
        <p className="text-xs text-neutral-500">Device Status</p>
        <div className="mt-1">
          <StatusBadge label={device?.status || "OFFLINE"} />
        </div>
      </div>
      <div>
        <p className="text-xs text-neutral-500">Branch</p>
        <p className="mt-1.5 text-sm text-neutral-200">{device?.gymName || "—"}</p>
      </div>
    </div>
  );
}
