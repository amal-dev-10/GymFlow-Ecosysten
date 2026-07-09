"use client";

import { useCallback, useState } from "react";
import { deviceAdapter } from "@/services/deviceAdapter";
import { useDoorController } from "./useDoorController";
import { useLogsStore } from "@/store/useLogsStore";
import { useMemberHistoryStore } from "@/store/useMemberHistoryStore";
import type { AttendanceDecision, ScanMethod } from "@/types/device";
import type { SimMember } from "@/types/member";

const SCAN_LOG_TYPE: Record<ScanMethod, "FINGERPRINT_SCAN" | "QR_SCAN" | "RFID_SCAN" | "FACE_SCAN" | "ATTENDANCE_ACCEPTED"> = {
  Fingerprint: "FINGERPRINT_SCAN",
  QR: "QR_SCAN",
  RFID: "RFID_SCAN",
  Face: "FACE_SCAN",
  Manual: "ATTENDANCE_ACCEPTED",
};

/**
 * Drives the "hardware recognized this member" simulation: the operator
 * picks a member and a scan method, and this hook reports it to the
 * backend through the adapter exactly like a real sensor match would.
 */
export function useAttendanceSimulation() {
  const addLog = useLogsStore((s) => s.addLog);
  const pushRecent = useMemberHistoryStore((s) => s.pushRecent);
  const { runGrantedSequence } = useDoorController();

  const [scanning, setScanning] = useState(false);
  const [lastDecision, setLastDecision] = useState<AttendanceDecision | null>(null);

  const scan = useCallback(
    async (method: ScanMethod, member: SimMember) => {
      setScanning(true);
      addLog({ type: SCAN_LOG_TYPE[method], message: `${method} scan triggered for ${member.name}` });

      try {
        const decision = await deviceAdapter.scan(method, member.id, member.name);
        setLastDecision(decision);
        pushRecent(member);

        addLog({
          type: decision.status === "Granted" ? "ATTENDANCE_ACCEPTED" : "ATTENDANCE_DENIED",
          message:
            decision.status === "Granted"
              ? `Attendance accepted for ${member.name}`
              : `Attendance denied for ${member.name}${decision.reason ? ` - ${decision.reason}` : ""}`,
        });

        if (decision.status === "Granted") {
          runGrantedSequence();
        }

        return decision;
      } catch (error: any) {
        const decision: AttendanceDecision = {
          status: "Denied",
          reason: error?.message || "Scan failed",
          memberName: member.name,
        };
        setLastDecision(decision);
        addLog({ type: "ATTENDANCE_DENIED", message: `Attendance denied for ${member.name} - ${decision.reason}` });
        return decision;
      } finally {
        setScanning(false);
      }
    },
    [addLog, pushRecent, runGrantedSequence]
  );

  return { scan, scanning, lastDecision };
}
