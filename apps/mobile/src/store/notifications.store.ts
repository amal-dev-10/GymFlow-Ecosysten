import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../lib/mmkv';

export interface NotificationItem {
  id: string;
  category: 'membership' | 'payments' | 'attendance' | 'checkin' | 'trainer' | 'system';
  title: string;
  description: string;
  time: string; // ISO String
  priority: 'critical' | 'high' | 'normal' | 'low';
  read: boolean;
  actionType?: 'open-member' | 'collect-payment' | 'renew-membership' | 'checkin' | 'checkout' | 'open-session';
  memberId?: string;
  invoiceId?: string;
  sessionId?: string;
}

export interface TaskItem {
  id: string;
  category: 'renew' | 'collect' | 'session' | 'measurement' | 'attendance' | 'workout';
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  completed: boolean;
  dueDate: string;
  memberId?: string;
  memberName?: string;
  invoiceId?: string;
}

/** A freshly-derived item carries no read/completed flag — those live as overlays. */
export type LiveNotification = Omit<NotificationItem, 'read'>;
export type LiveTask = Omit<TaskItem, 'completed'>;

interface NotificationsState {
  notifications: NotificationItem[];
  tasks: TaskItem[];
  unreadCount: number;

  // Persisted overlays so read/completed/dismissed survive feed regeneration
  // and app restarts even though the feed itself is derived live.
  readIds: string[];
  completedIds: string[];
  dismissedIds: string[];

  /** Replace the feed with freshly-derived items, preserving local state. */
  syncLiveItems: (notifications: LiveNotification[], tasks: LiveTask[]) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  deleteNotification: (id: string) => void;
  completeTask: (id: string) => void;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      notifications: [],
      tasks: [],
      unreadCount: 0,
      readIds: [],
      completedIds: [],
      dismissedIds: [],

      syncLiveItems: (liveNotifications, liveTasks) => {
        const { readIds, completedIds, dismissedIds } = get();
        const notifications: NotificationItem[] = liveNotifications
          .filter((n) => !dismissedIds.includes(n.id))
          .map((n) => ({ ...n, read: readIds.includes(n.id) }));
        const tasks: TaskItem[] = liveTasks
          .filter((t) => !completedIds.includes(t.id) && !dismissedIds.includes(t.id))
          .map((t) => ({ ...t, completed: false }));

        set({
          notifications,
          tasks,
          unreadCount: notifications.filter((n) => !n.read).length,
        });
      },

      markRead: (id) => {
        set((state) => {
          const readIds = state.readIds.includes(id) ? state.readIds : [...state.readIds, id];
          const notifications = state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          );
          return { readIds, notifications, unreadCount: notifications.filter((n) => !n.read).length };
        });
      },

      markAllRead: () => {
        set((state) => {
          const allIds = state.notifications.map((n) => n.id);
          const readIds = Array.from(new Set([...state.readIds, ...allIds]));
          const notifications = state.notifications.map((n) => ({ ...n, read: true }));
          return { readIds, notifications, unreadCount: 0 };
        });
      },

      deleteNotification: (id) => {
        set((state) => {
          const dismissedIds = state.dismissedIds.includes(id)
            ? state.dismissedIds
            : [...state.dismissedIds, id];
          const notifications = state.notifications.filter((n) => n.id !== id);
          return { dismissedIds, notifications, unreadCount: notifications.filter((n) => !n.read).length };
        });
      },

      completeTask: (id) => {
        set((state) => {
          const completedIds = state.completedIds.includes(id)
            ? state.completedIds
            : [...state.completedIds, id];
          return { completedIds, tasks: state.tasks.filter((t) => t.id !== id) };
        });
      },
    }),
    {
      name: 'gymflow-notifications',
      storage: createJSONStorage(() => mmkvStorage),
      // Only the local overlays need to persist; the feed is re-derived on load.
      partialize: (state) => ({
        readIds: state.readIds,
        completedIds: state.completedIds,
        dismissedIds: state.dismissedIds,
      }),
    }
  )
);
