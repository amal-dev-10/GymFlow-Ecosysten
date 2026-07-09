import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../lib/mmkv';
import { ThemeType } from '../theme/theme';

interface AppState {
  themePreference: ThemeType;
  isOffline: boolean;
  activeModalCount: number;
  setThemePreference: (theme: ThemeType) => void;
  setOfflineStatus: (isOffline: boolean) => void;
  incrementModalCount: () => void;
  decrementModalCount: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      themePreference: 'system',
      isOffline: false,
      activeModalCount: 0,
      setThemePreference: (themePreference) => set({ themePreference }),
      setOfflineStatus: (isOffline) => set({ isOffline }),
      incrementModalCount: () => set((state) => ({ activeModalCount: state.activeModalCount + 1 })),
      decrementModalCount: () => set((state) => ({ activeModalCount: Math.max(0, state.activeModalCount - 1) })),
    }),
    {
      name: 'gymflow-staff-app',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        themePreference: state.themePreference,
        isOffline: state.isOffline,
      }), // Don't persist activeModalCount across app relaunches
    }
  )
);
