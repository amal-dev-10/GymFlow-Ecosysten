import { create } from "zustand";

export interface Notification {
  id: string;
  level: "info" | "warning" | "error";
  message: string;
}

interface NotificationState {
  notifications: Notification[];
  push: (notification: Omit<Notification, "id">) => void;
  dismiss: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  push: (notification) =>
    set((state) => ({
      notifications: [...state.notifications, { ...notification, id: crypto.randomUUID() }],
    })),
  dismiss: (id) => set((state) => ({ notifications: state.notifications.filter((n) => n.id !== id) })),
}));
