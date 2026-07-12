"use client";

import { useState } from "react";
import { Wrench, ZapOff, WifiOff, AlertTriangle, Bug } from "lucide-react";

export default function DeveloperToolsPage() {
  const [activeSimulation, setActiveSimulation] = useState<string | null>(null);

  const simulate = (name: string, durationMs: number = 3000) => {
    setActiveSimulation(name);
    // In a real simulator, this would write to a zustand store to intercept fetch calls
    // e.g., setNetworkDelay(5000), setForceOffline(true), setInvalidPayload(true)
    setTimeout(() => {
      setActiveSimulation(null);
    }, durationMs);
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-100">Developer Tools</h1>
        <p className="text-sm text-neutral-400">Force error states and network degradation for testing the Device Gateway.</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-4 text-sm font-medium text-neutral-300 flex items-center gap-2">
            <WifiOff size={18} className="text-orange-500" /> Network Degradation
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => simulate("SLOW_NETWORK", 10000)}
              className={`flex items-center justify-center gap-2 rounded-md border border-neutral-700 px-4 py-3 text-sm font-medium hover:bg-neutral-800 transition-colors ${activeSimulation === "SLOW_NETWORK" ? "bg-orange-500/10 text-orange-400 border-orange-500/50" : "text-neutral-300"}`}
            >
              Simulate Slow Network (10s)
            </button>
            <button
              onClick={() => simulate("OFFLINE_MODE", 10000)}
              className={`flex items-center justify-center gap-2 rounded-md border border-neutral-700 px-4 py-3 text-sm font-medium hover:bg-neutral-800 transition-colors ${activeSimulation === "OFFLINE_MODE" ? "bg-red-500/10 text-red-400 border-red-500/50" : "text-neutral-300"}`}
            >
              Force Offline Mode (10s)
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-4 text-sm font-medium text-neutral-300 flex items-center gap-2">
            <Bug size={18} className="text-purple-500" /> Payload & Logic Errors
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => simulate("INVALID_KEY")}
              className={`flex items-center justify-center gap-2 rounded-md border border-neutral-700 px-4 py-3 text-sm font-medium hover:bg-neutral-800 transition-colors ${activeSimulation === "INVALID_KEY" ? "bg-purple-500/10 text-purple-400 border-purple-500/50" : "text-neutral-300"}`}
            >
              Send Invalid x-device-key
            </button>
            <button
              onClick={() => simulate("MALFORMED_JSON")}
              className={`flex items-center justify-center gap-2 rounded-md border border-neutral-700 px-4 py-3 text-sm font-medium hover:bg-neutral-800 transition-colors ${activeSimulation === "MALFORMED_JSON" ? "bg-purple-500/10 text-purple-400 border-purple-500/50" : "text-neutral-300"}`}
            >
              Send Malformed JSON Event
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-4 text-sm font-medium text-neutral-300 flex items-center gap-2">
            <ZapOff size={18} className="text-amber-500" /> Edge Cases
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => simulate("DUPLICATE_PUNCH")}
              className={`flex items-center justify-center gap-2 rounded-md border border-neutral-700 px-4 py-3 text-sm font-medium hover:bg-neutral-800 transition-colors ${activeSimulation === "DUPLICATE_PUNCH" ? "bg-amber-500/10 text-amber-400 border-amber-500/50" : "text-neutral-300"}`}
            >
              Duplicate Punch
            </button>
            <button
              onClick={() => simulate("SERVER_ERROR")}
              className={`flex items-center justify-center gap-2 rounded-md border border-neutral-700 px-4 py-3 text-sm font-medium hover:bg-neutral-800 transition-colors ${activeSimulation === "SERVER_ERROR" ? "bg-amber-500/10 text-amber-400 border-amber-500/50" : "text-neutral-300"}`}
            >
              Simulate 500 Server Error
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
