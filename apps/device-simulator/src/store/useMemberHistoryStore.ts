import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SimMember } from "@/types/member";

interface MemberHistoryState {
  recent: SimMember[];
  favourites: SimMember[];
  pushRecent: (member: SimMember) => void;
  toggleFavourite: (member: SimMember) => void;
  isFavourite: (memberId: string) => boolean;
}

const MAX_RECENT = 10;

export const useMemberHistoryStore = create<MemberHistoryState>()(
  persist(
    (set, get) => ({
      recent: [],
      favourites: [],
      pushRecent: (member) =>
        set((state) => ({
          recent: [member, ...state.recent.filter((m) => m.id !== member.id)].slice(0, MAX_RECENT),
        })),
      toggleFavourite: (member) =>
        set((state) => {
          const exists = state.favourites.some((m) => m.id === member.id);
          return {
            favourites: exists
              ? state.favourites.filter((m) => m.id !== member.id)
              : [member, ...state.favourites],
          };
        }),
      isFavourite: (memberId) => get().favourites.some((m) => m.id === memberId),
    }),
    { name: "device-simulator-member-history" }
  )
);
