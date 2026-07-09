"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useMemberIdLookup, useMemberNameSearch } from "@/hooks/useMemberSearch";
import type { SimMember } from "@/types/member";

const TABS = [
  { key: "name", label: "Search by Name" },
  { key: "id", label: "Search by Member ID" },
] as const;

export function MemberSearchPanel({
  gymId,
  onSelect,
}: {
  gymId: string;
  onSelect: (member: SimMember) => void;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("name");
  const [query, setQuery] = useState("");

  const nameSearch = useMemberNameSearch(tab === "name" ? query : "", gymId);
  const idLookup = useMemberIdLookup(tab === "id" ? query : "");

  const results: SimMember[] = tab === "name" ? nameSearch.members : idLookup.member ? [idLookup.member] : [];
  const loading = tab === "name" ? nameSearch.isFetching : idLookup.isFetching;
  const showEmpty = query.trim().length >= 2 && !loading && results.length === 0;

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
      <div className="mb-3 flex gap-1 rounded-md bg-neutral-950 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setQuery("");
            }}
            className={`flex-1 rounded px-2 py-1.5 text-xs font-medium transition-colors ${
              tab === t.key ? "bg-emerald-600 text-white" : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tab === "name" ? "Name or phone number..." : "Paste member UUID..."}
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 py-2 pl-8 pr-3 text-sm text-neutral-100 outline-none focus:border-emerald-500"
        />
      </div>

      <div className="mt-2 max-h-56 overflow-y-auto">
        {loading && <p className="px-1 py-2 text-xs text-neutral-500">Searching...</p>}
        {showEmpty && <p className="px-1 py-2 text-xs text-neutral-500">No members found.</p>}
        {!gymId && <p className="px-1 py-2 text-xs text-amber-400">Connect a device to a branch first.</p>}
        {results.map((member) => (
          <button
            key={member.id}
            onClick={() => onSelect(member)}
            className="flex w-full flex-col items-start rounded-md px-2 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-800"
          >
            <span>{member.name}</span>
            {member.phone && <span className="text-xs text-neutral-500">{member.phone}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
