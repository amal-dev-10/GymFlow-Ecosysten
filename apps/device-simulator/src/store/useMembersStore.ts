import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SyncMember {
  externalUserId: string;
  name: string;
  fingerprintId: string | null;
  cardId: string | null;
}

interface MembersState {
  members: SyncMember[];
  setMembers: (members: SyncMember[]) => void;
  clearMembers: () => void;
}

export const useMembersStore = create<MembersState>()(
  persist(
    (set) => ({
      members: [],
      setMembers: (members) => set({ members }),
      clearMembers: () => set({ members: [] }),
    }),
    { name: "device-simulator-members" }
  )
);
