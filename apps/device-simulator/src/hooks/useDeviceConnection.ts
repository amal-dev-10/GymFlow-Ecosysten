"use client";

import { useCallback, useEffect, useRef } from "react";
import { deviceAdapter } from "@/services/deviceAdapter";
import { handleApiError } from "@/lib/api";
import { useConfigStore } from "@/store/useConfigStore";
import { useConnectionStore } from "@/store/useConnectionStore";
import { useDeviceStore } from "@/store/useDeviceStore";
import { useLogsStore } from "@/store/useLogsStore";

const HEARTBEAT_INTERVAL_MS = 30_000;
const RECONNECT_INTERVAL_MS = 5_000;

/**
 * Orchestrates the device lifecycle (register -> connect -> heartbeat ->
 * reconnect) on top of the adapter and stores. Components never call the
 * adapter or backend directly - they only use this hook.
 */
export function useDeviceConnection() {
  const config = useConfigStore((s) => s.config);
  const registeredDeviceId = useConfigStore((s) => s.registeredDeviceId);
  const setRegisteredDeviceId = useConfigStore((s) => s.setRegisteredDeviceId);

  const status = useConnectionStore((s) => s.status);
  const reconnectAttempts = useConnectionStore((s) => s.reconnectAttempts);
  const setStatus = useConnectionStore((s) => s.setStatus);
  const setLastHeartbeatAt = useConnectionStore((s) => s.setLastHeartbeatAt);
  const setReconnectAttempts = useConnectionStore((s) => s.setReconnectAttempts);
  const setErrorMessage = useConnectionStore((s) => s.setErrorMessage);

  const device = useDeviceStore((s) => s.device);
  const setDevice = useDeviceStore((s) => s.setDevice);

  const addLog = useLogsStore((s) => s.addLog);

  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-attach the adapter to a device registered in a previous session (page reload).
  useEffect(() => {
    if (registeredDeviceId && config.gymId) {
      deviceAdapter.attachToDevice?.(registeredDeviceId, config.gymId);
    }
  }, [registeredDeviceId, config.gymId]);

  const clearTimers = useCallback(() => {
    if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    heartbeatTimer.current = null;
    reconnectTimer.current = null;
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimer.current) return;
    reconnectTimer.current = setTimeout(async () => {
      reconnectTimer.current = null;
      const attempts = useConnectionStore.getState().reconnectAttempts + 1;
      setReconnectAttempts(attempts);
      addLog({ type: "RECONNECT", message: `Reconnect attempt #${attempts}` });
      try {
        const record = await deviceAdapter.heartbeat();
        setDevice(record);
        setStatus("ONLINE");
        setLastHeartbeatAt(new Date().toISOString());
        setReconnectAttempts(0);
        setErrorMessage(null);
        addLog({ type: "CONNECTED", message: "Reconnected to backend" });
      } catch (error) {
        setErrorMessage(handleApiError(error));
        scheduleReconnect();
      }
    }, RECONNECT_INTERVAL_MS);
  }, [setDevice, setStatus, setLastHeartbeatAt, setReconnectAttempts, setErrorMessage, addLog]);

  const sendHeartbeat = useCallback(async () => {
    try {
      const record = await deviceAdapter.heartbeat();
      setDevice(record);
      setStatus("ONLINE");
      setLastHeartbeatAt(new Date().toISOString());
      setReconnectAttempts(0);
      setErrorMessage(null);
      addLog({ type: "HEARTBEAT", message: `Heartbeat OK - device ${record.status}` });
    } catch (error) {
      const message = handleApiError(error);
      setErrorMessage(message);
      setStatus("RECONNECTING");
      addLog({ type: "ERROR", message: `Heartbeat failed: ${message}` });
      scheduleReconnect();
    }
  }, [setDevice, setStatus, setLastHeartbeatAt, setReconnectAttempts, setErrorMessage, addLog, scheduleReconnect]);

  const startHeartbeatLoop = useCallback(() => {
    clearTimers();
    heartbeatTimer.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
  }, [clearTimers, sendHeartbeat]);

  const register = useCallback(async () => {
    setStatus("CONNECTING");
    try {
      const record = await deviceAdapter.register(config);
      setDevice(record);
      setRegisteredDeviceId(record.id);
      setStatus("DISCONNECTED");
      setErrorMessage(null);
      addLog({ type: "CONNECTED", message: `Device "${record.name}" registered (${record.id})` });
      return record;
    } catch (error) {
      const message = handleApiError(error);
      setErrorMessage(message);
      setStatus("DISCONNECTED");
      addLog({ type: "ERROR", message: `Registration failed: ${message}` });
      throw error;
    }
  }, [config, setDevice, setRegisteredDeviceId, setStatus, addLog, setErrorMessage]);

  const connect = useCallback(async () => {
    setStatus("CONNECTING");
    try {
      const record = await deviceAdapter.connect(config);
      setDevice(record);
      setStatus("ONLINE");
      setLastHeartbeatAt(new Date().toISOString());
      setErrorMessage(null);
      addLog({ type: "CONNECTED", message: `Connected to backend as "${record.name}"` });
      startHeartbeatLoop();
      return record;
    } catch (error) {
      const message = handleApiError(error);
      setErrorMessage(message);
      setStatus("DISCONNECTED");
      addLog({ type: "ERROR", message: `Connect failed: ${message}` });
      throw error;
    }
  }, [config, setDevice, setStatus, setLastHeartbeatAt, addLog, startHeartbeatLoop, setErrorMessage]);

  const disconnect = useCallback(async () => {
    clearTimers();
    await deviceAdapter.disconnect();
    setStatus("DISCONNECTED");
    addLog({ type: "DISCONNECTED", message: "Disconnected from backend" });
  }, [clearTimers, setStatus, addLog]);

  useEffect(() => clearTimers, [clearTimers]);

  return { device, status, reconnectAttempts, register, connect, disconnect };
}
