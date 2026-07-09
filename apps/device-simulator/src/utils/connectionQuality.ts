import type { ConnectionStatus } from "@/types/device";

export type ConnectionQuality = "Excellent" | "Fair" | "Poor" | "Offline";

export function getConnectionQuality(status: ConnectionStatus, reconnectAttempts: number): ConnectionQuality {
  if (status === "ONLINE" && reconnectAttempts === 0) return "Excellent";
  if (status === "ONLINE" && reconnectAttempts > 0) return "Fair";
  if (status === "RECONNECTING" || status === "CONNECTING") return "Poor";
  return "Offline";
}

export const QUALITY_COLORS: Record<ConnectionQuality, string> = {
  Excellent: "text-emerald-400",
  Fair: "text-amber-400",
  Poor: "text-orange-400",
  Offline: "text-neutral-500",
};
