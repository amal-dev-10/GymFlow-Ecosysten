"use client";

import { useLogsStore } from "@/store/useLogsStore";

export function RecentActivityPanel() {
  const logs = useLogsStore((s) => s.logs).slice(0, 8);

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
      <h3 className="mb-2 text-sm font-medium text-neutral-200">Recent Activity</h3>
      {logs.length === 0 && <p className="text-xs text-neutral-600">No activity yet.</p>}
      <div className="flex flex-col gap-1.5">
        {logs.map((log) => (
          <div key={log.id} className="flex items-center gap-2 text-xs">
            <span className="font-mono text-neutral-600">{new Date(log.timestamp).toLocaleTimeString()}</span>
            <span className="text-neutral-300">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
