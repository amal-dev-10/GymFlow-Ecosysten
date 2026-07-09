import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../lib/mmkv';
import { useWorkspaceStore } from './workspace.store';

// Matches the normalized user shape returned by the backend's /v1/auth
// endpoints (apps/api/src/modules/auth/auth.service.ts) — the same contract
// the web workspace app consumes.
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string; // 'owner' | 'branch_manager' | 'receptionist' | 'trainer' | 'dietitian' | custom role name
  organizationId: string;
  gymId: string;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      login: (user, accessToken, refreshToken) =>
        set({ user, token: accessToken, refreshToken, isAuthenticated: true }),
      setTokens: (accessToken, refreshToken) => set({ token: accessToken, refreshToken }),
      logout: () => {
        useWorkspaceStore.getState().clearWorkspace();
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
      },
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: 'gymflow-staff-auth',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
