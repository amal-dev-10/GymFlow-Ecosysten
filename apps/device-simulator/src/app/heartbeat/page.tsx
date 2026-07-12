"use client";

import { useConnectionStore } from "@/store/useConnectionStore";
import { deviceApi } from "@/lib/deviceApi";
import { useState, useEffect } from "react";
import { Activity, Play, Square } from "lucide-react";

export default function HeartbeatPage() {
  const { setLastHeartbeatAt } = useConnectionStore();
  const [loading, setLoading] = useState(false);
  const [autoHeartbeat, setAutoHeartbeat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const sendHeartbeat = async () => {
    setLoading(true);
    setError(null);
    try {
      await deviceApi.heartbeat({ version: "1.0.0", ipAddress: "192.168.1.100" });
      setLastHeartbeatAt(new Date().toISOString());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoHeartbeat) {
      interval = setInterval(() => {
        sendHeartbeat();
      }, 60000); // Fixed 60s for demo, can connect to config
    }
    return () => clearInterval(interval);
  }, [autoHeartbeat]);

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-100">Heartbeat Simulation</h1>
        <p className="text-sm text-neutral-400">Manage device keep-alive and network presence.</p>
      </div>

      <div className="mb-6 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="mb-4 text-sm font-medium text-neutral-300">Manual Trigger</h2>
        <button
          onClick={sendHeartbeat}
          disabled={loading}
          className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          <Activity size={16} />
          {loading ? "Sending..." : "Send Manual Heartbeat"}
        </button>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="mb-4 text-sm font-medium text-neutral-300">Auto Heartbeat</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setAutoHeartbeat(true)}
            disabled={autoHeartbeat}
            className="flex items-center gap-2 rounded-md bg-neutral-700 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-600 disabled:opacity-50"
          >
            <Play size={16} />
            Start
          </button>
          <button
            onClick={() => setAutoHeartbeat(false)}
            disabled={!autoHeartbeat}
            className="flex items-center gap-2 rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
          >
            <Square size={16} />
            Stop
          </button>
          
          {autoHeartbeat && (
            <span className="flex items-center gap-2 text-xs text-emerald-500 animate-pulse">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              Running (60s)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
