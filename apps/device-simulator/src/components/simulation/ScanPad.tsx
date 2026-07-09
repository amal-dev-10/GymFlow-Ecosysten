"use client";

import { Fingerprint, QrCode, Radio, ScanFace, Hand } from "lucide-react";
import type { ScanMethod } from "@/types/device";
import type { SimMember } from "@/types/member";

const SCAN_BUTTONS: { method: ScanMethod; label: string; icon: typeof Fingerprint }[] = [
  { method: "Fingerprint", label: "Fingerprint Scan", icon: Fingerprint },
  { method: "QR", label: "QR Scan", icon: QrCode },
  { method: "RFID", label: "RFID Scan", icon: Radio },
  { method: "Face", label: "Face Scan", icon: ScanFace },
  { method: "Manual", label: "Manual Trigger", icon: Hand },
];

export function ScanPad({
  selectedMember,
  disabled,
  scanning,
  onScan,
}: {
  selectedMember: SimMember | null;
  disabled: boolean;
  scanning: boolean;
  onScan: (method: ScanMethod) => void;
}) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
      <h2 className="mb-1 text-sm font-medium text-neutral-200">Attendance Simulation</h2>
      <p className="mb-3 text-xs text-neutral-500">
        {selectedMember ? (
          <>
            Selected: <span className="text-neutral-200">{selectedMember.name}</span>
          </>
        ) : (
          "Select a member to simulate a scan."
        )}
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {SCAN_BUTTONS.map(({ method, label, icon: Icon }) => (
          <button
            key={method}
            disabled={disabled || scanning || !selectedMember}
            onClick={() => onScan(method)}
            className="flex flex-col items-center gap-2 rounded-md border border-neutral-700 bg-neutral-950 py-4 text-xs text-neutral-300 transition-colors hover:border-emerald-500 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon size={20} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
