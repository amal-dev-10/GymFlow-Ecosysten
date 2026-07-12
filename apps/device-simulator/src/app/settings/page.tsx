"use client";

import { useState } from "react";
import { Settings as SettingsIcon, Save } from "lucide-react";

export default function SettingsPage() {
  const [autoHeartbeat, setAutoHeartbeat] = useState(true);
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [verboseLogs, setVerboseLogs] = useState(false);

  const saveSettings = () => {
    alert("Simulator settings saved.");
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-100">Simulator Settings</h1>
        <p className="text-sm text-neutral-400">Configure how the simulator behaves locally.</p>
      </div>

      <div className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex items-center gap-2 mb-4">
          <SettingsIcon size={20} className="text-neutral-400" />
          <h2 className="text-sm font-medium text-neutral-200">Local Preferences</h2>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-neutral-800/60">
          <div>
            <div className="text-sm font-medium text-neutral-200">Auto Heartbeat on Boot</div>
            <div className="text-xs text-neutral-500">Start sending heartbeat automatically when Simulator starts.</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={autoHeartbeat} onChange={(e) => setAutoHeartbeat(e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-neutral-800/60">
          <div>
            <div className="text-sm font-medium text-neutral-200">Auto Reconnect</div>
            <div className="text-xs text-neutral-500">Attempt to reconnect when the server connection drops.</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={autoReconnect} onChange={(e) => setAutoReconnect(e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-neutral-800/60">
          <div>
            <div className="text-sm font-medium text-neutral-200">Auto Sync Members</div>
            <div className="text-xs text-neutral-500">Automatically pull members when booting.</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={autoSync} onChange={(e) => setAutoSync(e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        <div className="flex items-center justify-between py-3">
          <div>
            <div className="text-sm font-medium text-neutral-200">Verbose Logging</div>
            <div className="text-xs text-neutral-500">Capture full HTTP headers and raw socket frames in Logs.</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={verboseLogs} onChange={(e) => setVerboseLogs(e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        <button
          onClick={saveSettings}
          className="mt-4 flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          <Save size={16} />
          Save Settings
        </button>
      </div>
    </div>
  );
}
