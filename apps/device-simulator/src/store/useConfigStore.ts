import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DeviceConfig } from "@/types/device";

interface ConfigState {
  config: DeviceConfig;
  registeredDeviceId: string | null;
  setConfig: (config: Partial<DeviceConfig>) => void;
  setRegisteredDeviceId: (id: string | null) => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      config: {
        deviceName: "F22 Simulator",
        vendor: "ZKTeco",
        model: "F22",
        serialNumber: "SIM-000001",
        deviceKey: "",
        webhookUrl: "http://localhost:5000/v1/devices",
        heartbeatInterval: 60,
      },
      registeredDeviceId: null,
      setConfig: (partial) => set((state) => ({ config: { ...state.config, ...partial } })),
      setRegisteredDeviceId: (id) => set({ registeredDeviceId: id }),
    }),
    { name: "device-simulator-config" }
  )
);
