"use client";

import { useState } from "react";
import { MemberSearchPanel } from "@/components/simulation/MemberSearchPanel";
import { DoorVisualization } from "@/components/DoorVisualization";
import { RecentFavouriteMembers } from "@/components/simulation/RecentFavouriteMembers";
import { ScanPad } from "@/components/simulation/ScanPad";
import { DecisionBanner } from "@/components/simulation/DecisionBanner";
import { useAttendanceSimulation } from "@/hooks/useAttendanceSimulation";
import { useConnectionStore } from "@/store/useConnectionStore";
import { useDeviceStore } from "@/store/useDeviceStore";
import type { ScanMethod } from "@/types/device";
import type { SimMember } from "@/types/member";

export default function SimulationPage() {
  const status = useConnectionStore((s) => s.status);
  const device = useDeviceStore((s) => s.device);
  const [selectedMember, setSelectedMember] = useState<SimMember | null>(null);
  const { scan, scanning, lastDecision } = useAttendanceSimulation();

  const isOnline = status === "ONLINE" || status === "RECONNECTING";

  const handleScan = (method: ScanMethod) => {
    if (!selectedMember) return;
    scan(method, selectedMember);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-neutral-100">Attendance Simulation</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Pick a member, then trigger a scan to simulate the hardware recognizing them.
        </p>
      </div>

      {!isOnline && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
          Device is not connected. Go to Connection to register and connect first.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MemberSearchPanel gymId={device?.gymId || ""} onSelect={setSelectedMember} />
        <RecentFavouriteMembers onSelect={setSelectedMember} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <ScanPad
          selectedMember={selectedMember}
          disabled={!isOnline}
          scanning={scanning}
          onScan={handleScan}
        />
        <DoorVisualization />
      </div>

      <DecisionBanner decision={lastDecision} />
    </div>
  );
}
