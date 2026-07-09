"use client";

import { StatusBadge } from "@/components/StatusBadge";
import { DoorVisualization } from "@/components/DoorVisualization";
import { InfoTile } from "@/components/dashboard/InfoTile";
import { RecentActivityPanel } from "@/components/dashboard/RecentActivityPanel";
import { useClock } from "@/hooks/useClock";
import { useConfigStore } from "@/store/useConfigStore";
import { useConnectionStore } from "@/store/useConnectionStore";
import { useDeviceStore } from "@/store/useDeviceStore";
import { useDoorStore } from "@/store/useDoorStore";
import { getConnectionQuality, QUALITY_COLORS } from "@/utils/connectionQuality";

export default function DashboardPage() {
  const config = useConfigStore((s) => s.config);
  const device = useDeviceStore((s) => s.device);
  const status = useConnectionStore((s) => s.status);
  const lastHeartbeatAt = useConnectionStore((s) => s.lastHeartbeatAt);
  const reconnectAttempts = useConnectionStore((s) => s.reconnectAttempts);
  const doorState = useDoorStore((s) => s.state);
  const now = useClock();

  const quality = getConnectionQuality(status, reconnectAttempts);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-neutral-100">Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-500">Live overview of this device.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <InfoTile label="Device Name" value={device?.name || config.deviceName || "—"} />
        <InfoTile label="Device Type" value={device?.type || config.deviceType} />
        <InfoTile label="Branch" value={device?.gymName || "—"} />
        <InfoTile label="Device Status" value={<StatusBadge label={device?.status || "OFFLINE"} />} />
        <InfoTile label="Connection Status" value={<StatusBadge label={status} />} />
        <InfoTile
          label="Last Heartbeat"
          value={lastHeartbeatAt ? new Date(lastHeartbeatAt).toLocaleTimeString() : "Never"}
        />
        <InfoTile label="Door State" value={doorState} />
        <InfoTile label="Connection Quality" value={quality} valueClassName={QUALITY_COLORS[quality]} />
        <InfoTile label="Current Time" value={now.toLocaleTimeString()} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <RecentActivityPanel />
        <DoorVisualization />
      </div>
    </div>
  );
}
