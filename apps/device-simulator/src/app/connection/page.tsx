"use client";

import { useConnectionStore } from "@/store/useConnectionStore";
import { deviceApi } from "@/lib/deviceApi";
import { useState } from "react";
import { Activity, Plug, Unplug, Wifi, RefreshCw } from "lucide-react";

export default function ConnectionPage() {
  const { status, setStatus, setErrorMessage, errorMessage } = useConnectionStore();
  const [loading, setLoading] = useState<string | null>(null);

  const testConnection = async () => {
    setLoading("test");
    setErrorMessage(null);
    try {
      await deviceApi.testConnection();
      setStatus("ONLINE");
      alert("Connection test successful!");
    } catch (err: any) {
      setStatus("ERROR");
      setErrorMessage(err.message);
    } finally {
      setLoading(null);
    }
  };

  const connect = () => {
    setStatus("ONLINE");
    setErrorMessage(null);
  };

  const disconnect = () => {
    setStatus("DISCONNECTED");
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-100">Connection Manager</h1>
        <p className="text-sm text-neutral-400">Manage simulator backend connectivity.</p>
      </div>

      <div className="mb-6 flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <div>
          <h2 className="text-sm font-medium text-neutral-300">Current Status</h2>
          <div className="mt-1 flex items-center gap-2">
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                status === "ONLINE"
                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                  : status === "ERROR"
                  ? "bg-red-500"
                  : "bg-neutral-500"
              }`}
            />
            <span className="font-mono text-lg font-bold uppercase tracking-wider text-neutral-100">
              {status}
            </span>
          </div>
          {errorMessage && <p className="mt-2 text-xs text-red-400">{errorMessage}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={testConnection}
          disabled={loading !== null}
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
        >
          <Activity size={24} className="text-blue-500" />
          <span className="text-sm font-medium">Test Connection</span>
        </button>

        <button
          onClick={testConnection} // ping acts similarly to test
          disabled={loading !== null}
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
        >
          <Wifi size={24} className="text-purple-500" />
          <span className="text-sm font-medium">Ping Backend</span>
        </button>

        <button
          onClick={connect}
          disabled={status === "ONLINE"}
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
        >
          <Plug size={24} className="text-emerald-500" />
          <span className="text-sm font-medium">Connect</span>
        </button>

        <button
          onClick={disconnect}
          disabled={status === "DISCONNECTED"}
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
        >
          <Unplug size={24} className="text-neutral-500" />
          <span className="text-sm font-medium">Disconnect</span>
        </button>
      </div>
    </div>
  );
}
