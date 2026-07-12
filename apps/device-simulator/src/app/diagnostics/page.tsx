"use client";

import { useConfigStore } from "@/store/useConfigStore";
import { useConnectionStore } from "@/store/useConnectionStore";
import { HardDrive, Cpu, Activity, Wifi, Server } from "lucide-react";
import { useEffect, useState } from "react";

export default function DiagnosticsPage() {
  const { config } = useConfigStore();
  const { status } = useConnectionStore();

  const [memory, setMemory] = useState(45);
  const [cpu, setCpu] = useState(12);

  // Animate fake hardware stats
  useEffect(() => {
    const int = setInterval(() => {
      setMemory((prev) => Math.min(100, Math.max(0, prev + (Math.random() * 4 - 2))));
      setCpu((prev) => Math.min(100, Math.max(0, prev + (Math.random() * 10 - 5))));
    }, 2000);
    return () => clearInterval(int);
  }, []);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-100">Diagnostics</h1>
        <p className="text-sm text-neutral-400">View simulated hardware telemetry and system state.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-neutral-400">CPU Usage</h2>
            <Cpu size={16} className="text-blue-500" />
          </div>
          <div className="mt-2 text-3xl font-bold text-neutral-100">{cpu.toFixed(1)}%</div>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
            <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${cpu}%` }} />
          </div>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-neutral-400">Memory Allocation</h2>
            <Activity size={16} className="text-purple-500" />
          </div>
          <div className="mt-2 text-3xl font-bold text-neutral-100">{memory.toFixed(1)}%</div>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
            <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${memory}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <div className="flex items-center justify-between mb-2">
            <Wifi size={16} className="text-emerald-500" />
          </div>
          <div className="text-xs text-neutral-500 uppercase tracking-wider">Network</div>
          <div className="mt-1 font-mono text-sm text-neutral-200">WLAN (Good)</div>
        </div>
        
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <div className="flex items-center justify-between mb-2">
            <Server size={16} className="text-amber-500" />
          </div>
          <div className="text-xs text-neutral-500 uppercase tracking-wider">Connection</div>
          <div className="mt-1 font-mono text-sm text-neutral-200">{status}</div>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <div className="flex items-center justify-between mb-2">
            <HardDrive size={16} className="text-sky-500" />
          </div>
          <div className="text-xs text-neutral-500 uppercase tracking-wider">Storage</div>
          <div className="mt-1 font-mono text-sm text-neutral-200">12.4 MB Free</div>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="mb-4 text-sm font-medium text-neutral-300">System Information</h2>
        <div className="divide-y divide-neutral-800 text-sm">
          <div className="flex justify-between py-2">
            <span className="text-neutral-500">Firmware Version</span>
            <span className="font-mono text-neutral-200">v1.2.4-SIM</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-neutral-500">Model</span>
            <span className="font-mono text-neutral-200">{config.model}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-neutral-500">Vendor</span>
            <span className="font-mono text-neutral-200">{config.vendor}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-neutral-500">Serial Number</span>
            <span className="font-mono text-neutral-200">{config.serialNumber}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
