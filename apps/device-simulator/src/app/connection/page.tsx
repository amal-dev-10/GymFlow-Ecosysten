"use client";

import { useState } from "react";
import { OperatorAuthCard } from "@/components/connection/OperatorAuthCard";
import { DeviceConfigForm } from "@/components/connection/DeviceConfigForm";
import { ConnectionStatusPanel } from "@/components/connection/ConnectionStatusPanel";
import { useDeviceConnection } from "@/hooks/useDeviceConnection";
import { useOperatorSession } from "@/hooks/useOperatorSession";
import { useConfigStore } from "@/store/useConfigStore";

export default function ConnectionPage() {
  const { isAuthenticated } = useOperatorSession();
  const { device, status, register, connect, disconnect } = useDeviceConnection();
  const registeredDeviceId = useConfigStore((s) => s.registeredDeviceId);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const isOnline = status === "ONLINE" || status === "RECONNECTING";

  const run = async (action: string, fn: () => Promise<unknown>) => {
    setBusy(action);
    setActionError(null);
    try {
      await fn();
    } catch (err: any) {
      setActionError(err?.message || "Action failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-neutral-100">Connection</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Register and connect this simulator to the backend, exactly as a physical device would.
        </p>
      </div>

      <OperatorAuthCard />

      <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
        <h2 className="mb-3 text-sm font-medium text-neutral-200">Device Configuration</h2>
        <DeviceConfigForm disabled={!isAuthenticated || isOnline} />

        <div className="mt-4 flex gap-2">
          <button
            disabled={!isAuthenticated || isOnline || busy !== null}
            onClick={() => run("register", register)}
            className="rounded-md bg-neutral-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy === "register" ? "Registering…" : "Register"}
          </button>
          <button
            disabled={!isAuthenticated || isOnline || !registeredDeviceId || busy !== null}
            onClick={() => run("connect", connect)}
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy === "connect" ? "Connecting…" : "Connect"}
          </button>
          <button
            disabled={!isOnline || busy !== null}
            onClick={() => run("disconnect", disconnect)}
            className="rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
          >
            Disconnect
          </button>
        </div>
        {actionError && <p className="mt-2 text-xs text-red-400">{actionError}</p>}
      </div>

      <ConnectionStatusPanel connectionStatus={status} device={device} />
    </div>
  );
}
