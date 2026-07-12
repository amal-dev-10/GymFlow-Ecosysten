"use client";

import { deviceApi } from "@/lib/deviceApi";
import { useState } from "react";
import { Bell, Send } from "lucide-react";

export default function EventsPage() {
  const [eventType, setEventType] = useState("ACCESS_DENIED");
  const [payloadJson, setPayloadJson] = useState('{\n  "reason": "Membership Expired",\n  "userId": "1001"\n}');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const sendEvent = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    let parsed: any = {};
    try {
      parsed = JSON.parse(payloadJson);
    } catch (e) {
      setError("Invalid JSON payload");
      setLoading(false);
      return;
    }

    try {
      await deviceApi.events({
        type: eventType,
        timestamp: new Date().toISOString(),
        ...parsed,
      });
      setSuccess(`${eventType} event dispatched successfully.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-100">Event Generator</h1>
        <p className="text-sm text-neutral-400">Manually construct and dispatch arbitrary device events.</p>
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
        <div className="mb-6 flex items-center gap-2">
          <Bell className="text-emerald-500" size={24} />
          <h2 className="text-lg font-medium text-neutral-200">Custom Event</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-300">Event Type</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
            >
              <option value="ACCESS_DENIED">ACCESS_DENIED</option>
              <option value="CHECK_OUT">CHECK_OUT</option>
              <option value="TAMPER_ALARM">TAMPER_ALARM</option>
              <option value="POWER_FAILURE">POWER_FAILURE</option>
              <option value="DEVICE_RESTART">DEVICE_RESTART</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-300">Payload (JSON)</label>
            <textarea
              value={payloadJson}
              onChange={(e) => setPayloadJson(e.target.value)}
              rows={6}
              className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none font-mono"
            />
          </div>

          <button
            onClick={sendEvent}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            <Send size={16} />
            {loading ? "Sending..." : "Dispatch Event"}
          </button>
        </div>

        {error && <p className="mt-4 text-sm text-red-400 text-center">{error}</p>}
        {success && <p className="mt-4 text-sm text-emerald-400 text-center">{success}</p>}
      </div>
    </div>
  );
}
