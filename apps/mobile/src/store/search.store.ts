import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../lib/mmkv';

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'members' | 'employees' | 'payments' | 'attendance' | 'inventory' | 'reports' | 'settings' | 'commands';
  status?: string;
  route?: string;
  actionType?: string;
  payload?: any;
}

interface SearchState {
  isOpen: boolean;
  recentSearches: SearchResultItem[];
  pinnedFavorites: SearchResultItem[];
  
  openSearch: () => void;
  closeSearch: () => void;
  addRecent: (item: SearchResultItem) => void;
  removeRecent: (id: string) => void;
  clearRecent: () => void;
  togglePin: (item: SearchResultItem) => void;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      recentSearches: [],
      pinnedFavorites: [],

      openSearch: () => set({ isOpen: true }),
      closeSearch: () => set({ isOpen: false }),

      addRecent: (item) => {
        const filtered = get().recentSearches.filter((x) => x.id !== item.id);
        set({
          recentSearches: [item, ...filtered].slice(0, 15), // limit history to 15
        });
      },

      removeRecent: (id) => {
        set({
          recentSearches: get().recentSearches.filter((x) => x.id !== id),
        });
      },

      clearRecent: () => set({ recentSearches: [] }),

      togglePin: (item) => {
        const isPinned = get().pinnedFavorites.some((x) => x.id === item.id);
        if (isPinned) {
          set({
            pinnedFavorites: get().pinnedFavorites.filter((x) => x.id !== item.id),
          });
        } else {
          set({
            pinnedFavorites: [item, ...get().pinnedFavorites],
          });
        }
      },
    }),
    {
      name: 'gymflow-staff-search',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        recentSearches: state.recentSearches,
        pinnedFavorites: state.pinnedFavorites,
      }),
    }
  )
);
