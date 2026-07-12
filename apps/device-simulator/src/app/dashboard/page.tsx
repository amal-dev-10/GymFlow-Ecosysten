"use client";

import { useConfigStore } from "@/store/useConfigStore";
import { useConnectionStore } from "@/store/useConnectionStore";
import { useLogsStore } from "@/store/useLogsStore";
import { useMembersStore } from "@/store/useMembersStore";
import { InfoTile } from "@/components/dashboard/InfoTile";
import { StatusBadge } from "@/components/StatusBadge";
import { Activity, ShieldCheck, Cpu } from "lucide-react";

export default function DashboardPage() {
  const { config } = useConfigStore();
  const { status, lastHeartbeatAt } = useConnectionStore();
  const { logs } = useLogsStore();
  const { members } = useMembersStore();

  const isOnline = status === "ONLINE";

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-100">Simulator Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-400">High-level overview of the F22 emulator state.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <InfoTile label="Device Name" value={config.deviceName || "—"} />
        <InfoTile label="Model" value={config.model || "—"} />
        <InfoTile label="Serial Number" value={config.serialNumber || "—"} />
        <InfoTile label="Connection Status" value={<StatusBadge label={status} />} />
        
        <InfoTile
          label="Last Heartbeat"
          value={lastHeartbeatAt ? new Date(lastHeartbeatAt).toLocaleTimeString() : "Never"}
        />
        <InfoTile label="Members Synced" value={`${members.length} (Mock Memory)`} />
        <InfoTile label="Pending Events" value="0" />
        <InfoTile label="Firmware" value="v1.2.4-SIM" />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mt-4">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 flex items-start gap-4">
          <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-500">
            <Activity size={24} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-neutral-300">Total Requests</h3>
            <p className="text-2xl font-bold text-neutral-100">{logs.length}</p>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 flex items-start gap-4">
          <div className="rounded-full bg-blue-500/10 p-3 text-blue-500">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-neutral-300">Security</h3>
            <p className="text-2xl font-bold text-neutral-100">x-device-key Active</p>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 flex items-start gap-4">
          <div className="rounded-full bg-purple-500/10 p-3 text-purple-500">
            <Cpu size={24} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-neutral-300">System Health</h3>
            <p className="text-2xl font-bold text-neutral-100">{isOnline ? "Optimal" : "Offline"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
