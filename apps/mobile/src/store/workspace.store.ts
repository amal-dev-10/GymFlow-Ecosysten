import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../lib/mmkv';
import { permissionsForRole, Feature } from '../lib/permissions';

export interface GymSummary {
  id: string;
  name: string;
  address?: string | null;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  myRole: string | null;
  gyms: GymSummary[];
}

// NOTE: GymFlow's data model has no separate "Branch" entity below Gym — each
// Gym record (e.g. "Titan Fitness Uptown") already represents a single
// physical branch. So "branch" here is an alias of the selected gym, not a
// distinct third hierarchy level. If a real Branch entity is ever added to
// the schema, only this store + the (lobby)/branch step need to change.
interface WorkspaceState {
  activeOrganizationId: string | null;
  activeOrganizationName: string | null;
  activeGymId: string | null;
  activeGymName: string | null;
  activeBranchId: string | null;
  activeBranchName: string | null;
  role: string | null;
  permissions: Feature[];
  isWorkspaceSelected: boolean;
  selectOrganization: (org: { id: string; name: string }, role: string | null) => void;
  selectGym: (gym: { id: string; name: string }) => void;
  clearWorkspace: () => void;
  /** Updates role/permissions in place without disturbing the active gym — used when
   * revalidating a restored workspace on app launch (role may have changed since). */
  refreshRole: (role: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeOrganizationId: null,
      activeOrganizationName: null,
      activeGymId: null,
      activeGymName: null,
      activeBranchId: null,
      activeBranchName: null,
      role: null,
      permissions: [],
      isWorkspaceSelected: false,
      selectOrganization: (org, role) =>
        set({
          activeOrganizationId: org.id,
          activeOrganizationName: org.name,
          role,
          permissions: permissionsForRole(role),
          // Switching organizations invalidates any previously selected gym/branch
          activeGymId: null,
          activeGymName: null,
          activeBranchId: null,
          activeBranchName: null,
          isWorkspaceSelected: false,
        }),
      selectGym: (gym) =>
        set({
          activeGymId: gym.id,
          activeGymName: gym.name,
          // Gym IS the branch in this schema — see note above
          activeBranchId: gym.id,
          activeBranchName: gym.name,
          isWorkspaceSelected: true,
        }),
      refreshRole: (role) => set({ role, permissions: permissionsForRole(role) }),
      clearWorkspace: () =>
        set({
          activeOrganizationId: null,
          activeOrganizationName: null,
          activeGymId: null,
          activeGymName: null,
          activeBranchId: null,
          activeBranchName: null,
          role: null,
          permissions: [],
          isWorkspaceSelected: false,
        }),
    }),
    {
      name: 'gymflow-staff-workspace',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
