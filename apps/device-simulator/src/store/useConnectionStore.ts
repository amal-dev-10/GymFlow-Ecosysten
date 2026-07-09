import { create } from "zustand";
import type { ConnectionStatus } from "@/types/device";

interface ConnectionState {
  status: ConnectionStatus;
  lastHeartbeatAt: string | null;
  reconnectAttempts: number;
  errorMessage: string | null;
  setStatus: (status: ConnectionStatus) => void;
  setLastHeartbeatAt: (timestamp: string) => void;
  setReconnectAttempts: (attempts: number) => void;
  setErrorMessage: (message: string | null) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: "DISCONNECTED",
  lastHeartbeatAt: null,
  reconnectAttempts: 0,
  errorMessage: null,
  setStatus: (status) => set({ status }),
  setLastHeartbeatAt: (timestamp) => set({ lastHeartbeatAt: timestamp }),
  setReconnectAttempts: (attempts) => set({ reconnectAttempts: attempts }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
}));
