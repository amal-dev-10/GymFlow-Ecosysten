import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SimGym {
  id: string;
  name: string;
}

export interface SimOrganization {
  id: string;
  name: string;
}

interface SessionState {
  userName: string | null;
  organizations: SimOrganization[];
  organizationId: string | null;
  gyms: SimGym[];
  setSession: (session: {
    accessToken: string;
    refreshToken: string;
    userName: string;
    organizations: SimOrganization[];
    organizationId: string;
  }) => void;
  selectOrganization: (organizationId: string) => void;
  setGyms: (gyms: SimGym[]) => void;
  clearSession: () => void;
  isAuthenticated: () => boolean;
}

/**
 * Backend devices/attendance endpoints require an authenticated org-user
 * JWT (no device secret-key auth exists yet). This store holds that
 * "operator" session, separate from the device's own identity in
 * useConfigStore. See Phase 2 notes.
 *
 * A single phone number can belong to multiple organizations (e.g. an
 * owner running several gym brands), so the full organization list is
 * kept here and the operator can switch between them - each switch
 * updates the `x-organization-id` header used by every backend call and
 * reloads that organization's branches.
 */
export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      userName: null,
      organizations: [],
      organizationId: null,
      gyms: [],
      setSession: ({ accessToken, refreshToken, userName, organizations, organizationId }) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("device_token", accessToken);
          localStorage.setItem("device_refreshToken", refreshToken);
          localStorage.setItem("device_organizationId", organizationId);
        }
        set({ userName, organizations, organizationId, gyms: [] });
      },
      selectOrganization: (organizationId) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("device_organizationId", organizationId);
        }
        set({ organizationId, gyms: [] });
      },
      setGyms: (gyms) => set({ gyms }),
      clearSession: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("device_token");
          localStorage.removeItem("device_refreshToken");
          localStorage.removeItem("device_organizationId");
        }
        set({ userName: null, organizations: [], organizationId: null, gyms: [] });
      },
      isAuthenticated: () => !!get().organizationId && typeof window !== "undefined" && !!localStorage.getItem("device_token"),
    }),
    { name: "device-simulator-session" }
  )
);
