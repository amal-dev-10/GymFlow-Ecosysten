"use client";

import { useRealtimeSocket } from "@/hooks/useRealtimeSocket";
import { useConnectionStore } from "@/store/useConnectionStore";
import { useDeviceStore } from "@/store/useDeviceStore";

export function RealtimeProvider() {
  const status = useConnectionStore((s) => s.status);
  const device = useDeviceStore((s) => s.device);

  const isOnline = status === "ONLINE" || status === "RECONNECTING";
  useRealtimeSocket(isOnline ? device?.gymId : undefined);

  return null;
}
