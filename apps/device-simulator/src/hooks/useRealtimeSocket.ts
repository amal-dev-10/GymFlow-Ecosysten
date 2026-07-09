"use client";

import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import { env } from "@/utils/env";
import { useDeviceStore } from "@/store/useDeviceStore";
import { useLogsStore } from "@/store/useLogsStore";
import { useNotificationStore } from "@/store/useNotificationStore";

/**
 * Subscribes to the existing backend WebSocket gateway (apps/api's
 * RealtimeGateway, namespace `/attendance`) - the same one apps/web uses.
 *
 * The gateway only emits: attendance:check-in, attendance:check-out,
 * occupancy:update, device:status, membership:validation, alert. There is
 * no dedicated DEVICE_DISABLED / MEMBER_UPDATED / SERVER_MESSAGE event on
 * the backend, so this hook maps the spec's conceptual events onto the
 * closest real ones rather than inventing new server broadcasts:
 *   - device:status (for this device)        -> DEVICE_UPDATED / DEVICE_DISABLED
 *   - attendance:check-in / check-out          -> MEMBER_UPDATED
 *   - alert                                     -> SERVER_MESSAGE
 *
 * socket.io reconnects automatically by default; we just surface that in
 * the event log.
 */
export function useRealtimeSocket(gymId: string | undefined) {
  const setDevice = useDeviceStore((s) => s.setDevice);
  const addLog = useLogsStore((s) => s.addLog);
  const pushNotification = useNotificationStore((s) => s.push);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!gymId || typeof window === "undefined") return;

    let cancelled = false;

    (async () => {
      const { io } = await import("socket.io-client");
      if (cancelled) return;

      const token = localStorage.getItem("device_token");
      const socket = io(`${env.wsUrl}/attendance`, {
        auth: { token },
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("join:gym", { gymId });
        addLog({ type: "CONNECTED", message: "Realtime channel connected" });
      });

      socket.on("disconnect", () => {
        addLog({ type: "DISCONNECTED", message: "Realtime channel disconnected" });
      });

      socket.io.on("reconnect_attempt", (attempt: number) => {
        addLog({ type: "RECONNECT", message: `Realtime channel reconnect attempt #${attempt}` });
      });

      socket.io.on("reconnect", () => {
        socket.emit("join:gym", { gymId });
        addLog({ type: "CONNECTED", message: "Realtime channel reconnected" });
      });

      // DEVICE_UPDATED / DEVICE_DISABLED
      socket.on("device:status", (updated: any) => {
        const current = useDeviceStore.getState().device;
        if (!current || updated.id !== current.id) return;

        setDevice({ ...current, status: updated.status, lastHeartbeat: updated.lastHeartbeat });

        if (updated.status === "OFFLINE" || updated.status === "ERROR") {
          addLog({ type: "ERROR", message: `Device disabled/offline (server-pushed): ${updated.status}` });
          pushNotification({ level: "warning", message: "Device was marked offline by the backend." });
        } else {
          addLog({ type: "CONNECTED", message: `Device status updated by server: ${updated.status}` });
        }
      });

      // MEMBER_UPDATED (closest real signal: attendance changes for this branch)
      socket.on("attendance:check-in", (record: any) => {
        addLog({ type: "ATTENDANCE_ACCEPTED", message: `Server broadcast: ${record.memberName || "Member"} checked in elsewhere` });
      });

      socket.on("attendance:check-out", (record: any) => {
        addLog({ type: "CONNECTED", message: `Server broadcast: ${record.memberName || "Member"} checked out` });
      });

      // SERVER_MESSAGE
      socket.on("alert", (alert: any) => {
        const message = typeof alert === "string" ? alert : alert?.message || "Server message received";
        addLog({ type: "CONNECTED", message: `Server message: ${message}` });
        pushNotification({ level: "info", message });
      });
    })();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [gymId, setDevice, addLog, pushNotification]);
}
