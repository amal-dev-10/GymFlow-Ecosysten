"use client";

import { useConfigStore } from "@/store/useConfigStore";
import { Save } from "lucide-react";
import { useState } from "react";

export default function ConfigurationPage() {
  const { config, setConfig } = useConfigStore();
  const [localConfig, setLocalConfig] = useState(config);

  const handleSave = () => {
    setConfig(localConfig);
    alert("Configuration saved!");
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-100">Device Configuration</h1>
        <p className="text-sm text-neutral-400">Manage simulator identity and backend connection.</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-300">Device Name</label>
            <input
              type="text"
              value={localConfig.deviceName}
              onChange={(e) => setLocalConfig({ ...localConfig, deviceName: e.target.value })}
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-300">Serial Number</label>
            <input
              type="text"
              value={localConfig.serialNumber}
              onChange={(e) => setLocalConfig({ ...localConfig, serialNumber: e.target.value })}
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-300">Vendor</label>
            <input
              type="text"
              value={localConfig.vendor}
              onChange={(e) => setLocalConfig({ ...localConfig, vendor: e.target.value })}
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-300">Model</label>
            <input
              type="text"
              value={localConfig.model}
              onChange={(e) => setLocalConfig({ ...localConfig, model: e.target.value })}
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-neutral-300">Device Key (X-Device-Key)</label>
          <input
            type="password"
            value={localConfig.deviceKey}
            onChange={(e) => setLocalConfig({ ...localConfig, deviceKey: e.target.value })}
            className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none font-mono"
            placeholder="gym_dev_xxxxxxxxxxxxxxxx"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-neutral-300">Webhook URL</label>
          <input
            type="text"
            value={localConfig.webhookUrl}
            onChange={(e) => setLocalConfig({ ...localConfig, webhookUrl: e.target.value })}
            className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-neutral-300">Heartbeat Interval (seconds)</label>
          <input
            type="number"
            value={localConfig.heartbeatInterval}
            onChange={(e) => setLocalConfig({ ...localConfig, heartbeatInterval: parseInt(e.target.value, 10) || 60 })}
            className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <button
          onClick={handleSave}
          className="mt-4 flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          <Save size={16} />
          Save Configuration
        </button>
      </div>
    </div>
  );
}
