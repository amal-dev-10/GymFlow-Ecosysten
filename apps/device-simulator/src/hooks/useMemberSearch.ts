"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { membersApi } from "@/lib/api";
import { toSimMember } from "@/types/member";
import { useDebouncedValue } from "./useDebouncedValue";

export function useMemberNameSearch(query: string, gymId: string) {
  const debounced = useDebouncedValue(query, 300);
  const enabled = debounced.trim().length >= 2 && !!gymId;

  const result = useQuery({
    queryKey: ["members", "search", debounced, gymId],
    queryFn: () => membersApi.list({ search: debounced, gymId }),
    enabled,
  });

  const members = useMemo(() => (result.data || []).map(toSimMember), [result.data]);

  return { ...result, members, enabled };
}

export function useMemberIdLookup(memberId: string) {
  const debounced = useDebouncedValue(memberId, 300);
  const enabled = debounced.trim().length >= 8; // rough UUID-length guard

  const result = useQuery({
    queryKey: ["members", "byId", debounced],
    queryFn: () => membersApi.get(debounced),
    enabled,
    retry: false,
  });

  const member = result.data ? toSimMember(result.data) : null;

  return { ...result, member, enabled };
}
