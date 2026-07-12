"use client";

import { deviceApi } from "@/lib/deviceApi";
import { useState } from "react";
import { DoorOpen, DoorClosed, Lock, Unlock, AlertTriangle } from "lucide-react";

export default function DoorControlPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const simulateEvent = async (status: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await deviceApi.events({
        type: "DOOR_STATUS",
        status: status,
        timestamp: new Date().toISOString()
      });
      setSuccess(`Door event ${status} dispatched successfully.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-100">Door Control</h1>
        <p className="text-sm text-neutral-400">Emulate physical door lock interactions and sensor triggers.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-4 text-sm font-medium text-neutral-300">Lock Relay Controls</h2>
          <div className="flex flex-col gap-4">
            <button
              onClick={() => simulateEvent("UNLOCKED")}
              disabled={loading}
              className="flex items-center gap-3 rounded-md bg-neutral-800 px-4 py-3 text-sm font-medium text-emerald-400 hover:bg-neutral-700 disabled:opacity-50"
            >
              <Unlock size={20} />
              Unlock Door
            </button>
            <button
              onClick={() => simulateEvent("LOCKED")}
              disabled={loading}
              className="flex items-center gap-3 rounded-md bg-neutral-800 px-4 py-3 text-sm font-medium text-blue-400 hover:bg-neutral-700 disabled:opacity-50"
            >
              <Lock size={20} />
              Lock Door
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-4 text-sm font-medium text-neutral-300">Door Sensor (Magnet)</h2>
          <div className="flex flex-col gap-4">
            <button
              onClick={() => simulateEvent("OPEN")}
              disabled={loading}
              className="flex items-center gap-3 rounded-md bg-neutral-800 px-4 py-3 text-sm font-medium text-orange-400 hover:bg-neutral-700 disabled:opacity-50"
            >
              <DoorOpen size={20} />
              Door Opened
            </button>
            <button
              onClick={() => simulateEvent("CLOSED")}
              disabled={loading}
              className="flex items-center gap-3 rounded-md bg-neutral-800 px-4 py-3 text-sm font-medium text-neutral-300 hover:bg-neutral-700 disabled:opacity-50"
            >
              <DoorClosed size={20} />
              Door Closed
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="mb-4 text-sm font-medium text-red-400 flex items-center gap-2">
          <AlertTriangle size={18} /> Alarms
        </h2>
        <button
          onClick={() => simulateEvent("FORCED_OPEN")}
          disabled={loading}
          className="flex items-center gap-3 rounded-md border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-50 w-full justify-center"
        >
          <AlertTriangle size={20} />
          Trigger Door Forced Open Alarm
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-400 text-center">{error}</p>}
      {success && <p className="mt-4 text-sm text-emerald-400 text-center">{success}</p>}
    </div>
  );
}
