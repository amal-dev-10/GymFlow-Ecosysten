"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import type { AttendanceDecision } from "@/types/device";

export function DecisionBanner({ decision }: { decision: AttendanceDecision | null }) {
  if (!decision) return null;

  const granted = decision.status === "Granted";

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
        granted
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : "border-red-500/30 bg-red-500/10 text-red-400"
      }`}
    >
      {granted ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
      <span>
        {granted ? "Attendance Accepted" : "Access Denied"}
        {decision.memberName ? ` — ${decision.memberName}` : ""}
        {!granted && decision.reason ? `: ${decision.reason}` : ""}
      </span>
    </div>
  );
}
