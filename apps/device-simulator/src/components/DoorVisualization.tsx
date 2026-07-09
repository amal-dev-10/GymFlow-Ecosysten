"use client";

import { DoorClosed, DoorOpen } from "lucide-react";
import { useDoorStore } from "@/store/useDoorStore";
import type { DoorState } from "@/types/device";

const COPY: Record<DoorState, { label: string; className: string }> = {
  LOCKED: { label: "Locked", className: "text-neutral-400 border-neutral-700" },
  OPENING: { label: "Opening...", className: "text-amber-400 border-amber-500/40 animate-pulse" },
  OPEN: { label: "Open", className: "text-emerald-400 border-emerald-500/40" },
  CLOSING: { label: "Closing...", className: "text-amber-400 border-amber-500/40 animate-pulse" },
};

export function DoorVisualization() {
  const state = useDoorStore((s) => s.state);
  const { label, className } = COPY[state];
  const Icon = state === "LOCKED" ? DoorClosed : DoorOpen;

  return (
    <div className={`flex flex-col items-center justify-center gap-2 rounded-lg border bg-neutral-900/50 p-6 transition-colors ${className}`}>
      <Icon size={36} />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}
