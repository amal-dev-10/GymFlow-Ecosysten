"use client";

import { deviceApi } from "@/lib/deviceApi";
import { useState } from "react";
import { CreditCard, CheckCircle2, XCircle } from "lucide-react";

export default function RfidPage() {
  const [cardNumber, setCardNumber] = useState("RFID-001");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const simulateEvent = async (status: "SUCCESS" | "FAILED", overrideCard?: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await deviceApi.events({
        type: "CHECK_IN",
        method: "RFID",
        credentialId: overrideCard || cardNumber,
        status: status,
        timestamp: new Date().toISOString()
      });
      setSuccess(`RFID event dispatched successfully.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-100">RFID Simulator</h1>
        <p className="text-sm text-neutral-400">Emulate MIFARE or 125kHz Proximity card taps.</p>
      </div>

      <div className="mb-6 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
        <div className="mb-8 flex justify-center">
          <div className="flex h-32 w-48 items-center justify-center rounded-xl bg-neutral-800 border-2 border-neutral-700 shadow-md">
            <CreditCard size={48} className="text-blue-500 opacity-80" />
          </div>
        </div>

        <div className="mb-6 space-y-1.5">
          <label className="text-sm font-medium text-neutral-300">Card Number (Hex / Dec)</label>
          <input
            type="text"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-blue-500 focus:outline-none font-mono uppercase"
            placeholder="e.g. 04A1B2C3"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => simulateEvent("SUCCESS")}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-emerald-400 hover:bg-neutral-800 disabled:opacity-50"
          >
            <CheckCircle2 size={18} />
            <span className="text-sm font-medium">Tap Valid Card</span>
          </button>
          
          <button
            onClick={() => simulateEvent("FAILED", "INVALID-000")}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-red-400 hover:bg-neutral-800 disabled:opacity-50"
          >
            <XCircle size={18} />
            <span className="text-sm font-medium">Tap Invalid Card</span>
          </button>
        </div>

        {error && <p className="mt-4 text-sm text-red-400 text-center">{error}</p>}
        {success && <p className="mt-4 text-sm text-emerald-400 text-center">{success}</p>}
      </div>
    </div>
  );
}
