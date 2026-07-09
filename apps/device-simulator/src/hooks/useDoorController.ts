"use client";

import { useCallback, useEffect, useRef } from "react";
import { useDoorStore } from "@/store/useDoorStore";
import { useLogsStore } from "@/store/useLogsStore";

const TIMINGS = { opening: 1200, open: 2000, closing: 1200 };

/**
 * Drives the Locked -> Opening -> Open -> Closing -> Locked animation when
 * the backend returns ALLOW. On DENY, callers should simply leave the door
 * untouched (it stays Locked) and surface "Access Denied" in the UI.
 */
export function useDoorController() {
  const setState = useDoorStore((s) => s.setState);
  const addLog = useLogsStore((s) => s.addLog);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const runGrantedSequence = useCallback(() => {
    clearTimers();
    setState("OPENING");

    timers.current.push(
      setTimeout(() => {
        setState("OPEN");
        addLog({ type: "DOOR_OPENED", message: "Door opened" });

        timers.current.push(
          setTimeout(() => {
            setState("CLOSING");

            timers.current.push(
              setTimeout(() => {
                setState("LOCKED");
                addLog({ type: "DOOR_CLOSED", message: "Door closed" });
              }, TIMINGS.closing)
            );
          }, TIMINGS.open)
        );
      }, TIMINGS.opening)
    );
  }, [setState, addLog, clearTimers]);

  useEffect(() => clearTimers, [clearTimers]);

  return { runGrantedSequence };
}
