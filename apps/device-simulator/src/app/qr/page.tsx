"use client";

import { deviceApi } from "@/lib/deviceApi";
import { useState } from "react";
import { QrCode, CheckCircle2, XCircle } from "lucide-react";

export default function QrPage() {
  const [qrValue, setQrValue] = useState("gymflow_qr_token_12345");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const simulateEvent = async (status: "SUCCESS" | "FAILED", overrideQr?: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await deviceApi.events({
        type: "CHECK_IN",
        method: "QR",
        qrToken: overrideQr || qrValue,
        status: status,
        timestamp: new Date().toISOString()
      });
      setSuccess(`QR scan event dispatched successfully.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-100">QR Simulator</h1>
        <p className="text-sm text-neutral-400">Emulate camera-based QR code or Barcode scanning.</p>
      </div>

      <div className="mb-6 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
        <div className="mb-8 flex justify-center">
          <div className="flex h-32 w-32 items-center justify-center rounded-xl bg-neutral-800 border-2 border-neutral-700 shadow-md">
            <QrCode size={48} className="text-purple-500 opacity-80" />
          </div>
        </div>

        <div className="mb-6 space-y-1.5">
          <label className="text-sm font-medium text-neutral-300">QR Token Value</label>
          <input
            type="text"
            value={qrValue}
            onChange={(e) => setQrValue(e.target.value)}
            className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-purple-500 focus:outline-none font-mono"
            placeholder="e.g. eyJhbGci..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => simulateEvent("SUCCESS")}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-emerald-400 hover:bg-neutral-800 disabled:opacity-50"
          >
            <CheckCircle2 size={18} />
            <span className="text-sm font-medium">Scan Valid QR</span>
          </button>
          
          <button
            onClick={() => simulateEvent("FAILED", "expired_or_invalid_qr_token")}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-red-400 hover:bg-neutral-800 disabled:opacity-50"
          >
            <XCircle size={18} />
            <span className="text-sm font-medium">Scan Invalid QR</span>
          </button>
        </div>

        {error && <p className="mt-4 text-sm text-red-400 text-center">{error}</p>}
        {success && <p className="mt-4 text-sm text-emerald-400 text-center">{success}</p>}
      </div>
    </div>
  );
}
