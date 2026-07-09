"use client";

import { useConfigStore } from "@/store/useConfigStore";
import { useSessionStore } from "@/store/useSessionStore";
import type { DeviceType } from "@/types/device";

const DEVICE_TYPES: DeviceType[] = ["FINGERPRINT", "QR_SCANNER", "RFID", "FACE_CAMERA", "TURNSTILE", "BARCODE"];

const FIELD_CLASS =
  "rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500";

export function DeviceConfigForm({ disabled }: { disabled?: boolean }) {
  const config = useConfigStore((s) => s.config);
  const setConfig = useConfigStore((s) => s.setConfig);
  const gyms = useSessionStore((s) => s.gyms);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-xs text-neutral-400">
        Server URL
        <input
          className={FIELD_CLASS}
          value={config.serverUrl}
          disabled={disabled}
          onChange={(e) => setConfig({ serverUrl: e.target.value })}
          placeholder="http://localhost:5000"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-neutral-400">
        Branch
        <select
          className={FIELD_CLASS}
          value={config.gymId}
          disabled={disabled}
          onChange={(e) => setConfig({ gymId: e.target.value })}
        >
          <option value="">Select branch...</option>
          {gyms.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-neutral-400">
        Device Name
        <input
          className={FIELD_CLASS}
          value={config.deviceName}
          disabled={disabled}
          onChange={(e) => setConfig({ deviceName: e.target.value })}
          placeholder="Front Desk Scanner"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-neutral-400">
        Device Type
        <select
          className={FIELD_CLASS}
          value={config.deviceType}
          disabled={disabled}
          onChange={(e) => setConfig({ deviceType: e.target.value as DeviceType })}
        >
          {DEVICE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-neutral-400">
        Serial Number
        <input
          className={FIELD_CLASS}
          value={config.serialNumber}
          disabled={disabled}
          onChange={(e) => setConfig({ serialNumber: e.target.value })}
          placeholder="SIM-0001"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-neutral-400">
        Secret Key
        <input
          className={FIELD_CLASS}
          type="password"
          value={config.secretKey}
          disabled={disabled}
          onChange={(e) => setConfig({ secretKey: e.target.value })}
          placeholder="••••••••"
        />
      </label>
    </div>
  );
}
