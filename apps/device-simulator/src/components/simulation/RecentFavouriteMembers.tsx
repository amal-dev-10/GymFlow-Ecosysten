"use client";

import { Star } from "lucide-react";
import { useMemberHistoryStore } from "@/store/useMemberHistoryStore";
import type { SimMember } from "@/types/member";

function MemberRow({ member, onSelect }: { member: SimMember; onSelect: (m: SimMember) => void }) {
  const isFavourite = useMemberHistoryStore((s) => s.isFavourite(member.id));
  const toggleFavourite = useMemberHistoryStore((s) => s.toggleFavourite);

  return (
    <div className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-neutral-800">
      <button onClick={() => onSelect(member)} className="flex-1 text-left text-sm text-neutral-200">
        {member.name}
      </button>
      <button
        onClick={() => toggleFavourite(member)}
        className={isFavourite ? "text-amber-400" : "text-neutral-600 hover:text-neutral-400"}
        aria-label="Toggle favourite"
      >
        <Star size={14} fill={isFavourite ? "currentColor" : "none"} />
      </button>
    </div>
  );
}

export function RecentFavouriteMembers({ onSelect }: { onSelect: (member: SimMember) => void }) {
  const recent = useMemberHistoryStore((s) => s.recent);
  const favourites = useMemberHistoryStore((s) => s.favourites);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
        <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">Recent Members</h3>
        {recent.length === 0 && <p className="px-2 py-2 text-xs text-neutral-600">No scans yet.</p>}
        {recent.map((m) => (
          <MemberRow key={m.id} member={m} onSelect={onSelect} />
        ))}
      </div>
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
        <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">Favourite Members</h3>
        {favourites.length === 0 && <p className="px-2 py-2 text-xs text-neutral-600">No favourites yet.</p>}
        {favourites.map((m) => (
          <MemberRow key={m.id} member={m} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
