"use client";

import { deviceApi } from "@/lib/deviceApi";
import { useState } from "react";
import { Fingerprint, CheckCircle2, XCircle, PlusCircle, Trash2 } from "lucide-react";

export default function FingerprintPage() {
  const [userId, setUserId] = useState("101");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const simulateEvent = async (type: string, status: "SUCCESS" | "FAILED", overrideId?: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await deviceApi.events({
        type: type,
        method: "FINGERPRINT",
        userId: overrideId || userId,
        status: status,
        timestamp: new Date().toISOString()
      });
      setSuccess(`${type} event dispatched successfully.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-100">Fingerprint Simulator</h1>
        <p className="text-sm text-neutral-400">Emulate optical biometric scans and user operations.</p>
      </div>

      <div className="mb-6 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
        <div className="mb-6 flex justify-center">
          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-neutral-800 border-4 border-neutral-700 shadow-inner">
            <Fingerprint size={64} className="text-emerald-500 opacity-80" />
          </div>
        </div>

        <div className="mb-6 space-y-1.5">
          <label className="text-sm font-medium text-neutral-300">Target External User ID</label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none font-mono"
            placeholder="e.g. 1001"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => simulateEvent("CHECK_IN", "SUCCESS")}
            disabled={loading}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-emerald-400 hover:bg-neutral-800 disabled:opacity-50"
          >
            <CheckCircle2 size={24} />
            <span className="text-sm font-medium">Verify Success</span>
          </button>
          
          <button
            onClick={() => simulateEvent("CHECK_IN", "FAILED", "9999")}
            disabled={loading}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-red-400 hover:bg-neutral-800 disabled:opacity-50"
          >
            <XCircle size={24} />
            <span className="text-sm font-medium">Verify Failed (Unknown)</span>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <button
            onClick={() => simulateEvent("ENROLL", "SUCCESS")}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-blue-400 hover:bg-neutral-800 disabled:opacity-50"
          >
            <PlusCircle size={18} />
            <span className="text-sm font-medium">Enroll New</span>
          </button>
          <button
            onClick={() => simulateEvent("DELETE", "SUCCESS")}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-orange-400 hover:bg-neutral-800 disabled:opacity-50"
          >
            <Trash2 size={18} />
            <span className="text-sm font-medium">Delete Print</span>
          </button>
        </div>

        {error && <p className="mt-4 text-sm text-red-400 text-center">{error}</p>}
        {success && <p className="mt-4 text-sm text-emerald-400 text-center">{success}</p>}
      </div>
    </div>
  );
}
