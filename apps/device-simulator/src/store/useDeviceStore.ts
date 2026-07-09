import { create } from "zustand";
import type { DeviceRecord } from "@/types/device";

interface DeviceState {
  device: DeviceRecord | null;
  setDevice: (device: DeviceRecord | null) => void;
}

export const useDeviceStore = create<DeviceState>((set) => ({
  device: null,
  setDevice: (device) => set({ device }),
}));
