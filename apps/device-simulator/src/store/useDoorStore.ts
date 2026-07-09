import { create } from "zustand";
import type { DoorState } from "@/types/device";

interface DoorStoreState {
  state: DoorState;
  setState: (state: DoorState) => void;
}

export const useDoorStore = create<DoorStoreState>((set) => ({
  state: "LOCKED",
  setState: (state) => set({ state }),
}));
