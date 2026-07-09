import { create } from "zustand";

export interface LogEntry {
  id: string;
  type:
    | "CONNECTED"
    | "DISCONNECTED"
    | "RECONNECT"
    | "HEARTBEAT"
    | "FINGERPRINT_SCAN"
    | "QR_SCAN"
    | "RFID_SCAN"
    | "FACE_SCAN"
    | "ATTENDANCE_ACCEPTED"
    | "ATTENDANCE_DENIED"
    | "DOOR_OPENED"
    | "DOOR_CLOSED"
    | "ERROR";
  message: string;
  timestamp: string;
}

interface LogsState {
  logs: LogEntry[];
  addLog: (entry: Omit<LogEntry, "id" | "timestamp">) => void;
  clearLogs: () => void;
}

export const useLogsStore = create<LogsState>((set) => ({
  logs: [],
  addLog: (entry) =>
    set((state) => ({
      logs: [
        { ...entry, id: crypto.randomUUID(), timestamp: new Date().toISOString() },
        ...state.logs,
      ].slice(0, 500),
    })),
  clearLogs: () => set({ logs: [] }),
}));
