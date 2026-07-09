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
}

interface NotificationsState {
  notifications: NotificationItem[];
  tasks: TaskItem[];
  unreadCount: number;
  
  // Actions
  addNotification: (item: Omit<NotificationItem, 'id' | 'read' | 'time'>) => void;
  markRead: (id: string) => void;
  markUnread: (id: string) => void;
  markAllRead: () => void;
  deleteNotification: (id: string) => void;
  
  addTask: (task: Omit<TaskItem, 'id' | 'completed'>) => void;
  completeTask: (id: string) => void;
}

// Preset visual mock data so user is greeted with realistic activity inbox
const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  { id: 'n-1', category: 'checkin', title: 'Unauthorized Gym Entry Alert', description: 'John Doe scanned QR but has no active membership plan.', time: new Date(Date.now() - 5 * 60 * 1000).toISOString(), priority: 'critical', read: false, actionType: 'open-member', memberId: 'm-1' },
  { id: 'n-2', category: 'payments', title: 'Payment Received', description: '₹4,500 successfully collected from Sarah Connor.', time: new Date(Date.now() - 20 * 60 * 1000).toISOString(), priority: 'normal', read: false, actionType: 'collect-payment', memberId: 'm-2', invoiceId: 'inv-101' },
  { id: 'n-3', category: 'membership', title: 'Plan Expiry Notice', description: 'Michael Scott\'s Yearly Platinum membership expires in 3 days.', time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), priority: 'high', read: false, actionType: 'renew-membership', memberId: 'm-3' },
  { id: 'n-4', category: 'trainer', title: 'PT Feedback Logged', description: 'Sarah Connor left a 5-star rating on today\'s leg workout session.', time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), priority: 'normal', read: true },
];

const INITIAL_TASKS: TaskItem[] = [
  { id: 't-1', category: 'collect', title: 'Collect Fees: Dwight Schrute', description: 'Outstanding balance of ₹2,500 due on Platinum Plan.', priority: 'critical', completed: false, dueDate: new Date().toISOString(), memberId: 'm-4', memberName: 'Dwight Schrute' },
  { id: 't-2', category: 'renew', title: 'Renew: Michael Scott', description: 'Yearly Platinum plan is expiring soon.', priority: 'high', completed: false, dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), memberId: 'm-3', memberName: 'Michael Scott' },
  { id: 't-3', category: 'session', title: 'Complete PT: Jim Halpert', description: 'Log stats and feedback for today\'s chest coaching routine.', priority: 'normal', completed: false, dueDate: new Date().toISOString(), memberId: 'm-5', memberName: 'Jim Halpert' },
  { id: 't-4', category: 'measurement', title: 'Record Body Stats: Pam Beesly', description: 'Monthly circumference stats due today.', priority: 'normal', completed: false, dueDate: new Date().toISOString(), memberId: 'm-6', memberName: 'Pam Beesly' },
];

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      notifications: INITIAL_NOTIFICATIONS,
      tasks: INITIAL_TASKS,
      unreadCount: INITIAL_NOTIFICATIONS.filter(n => !n.read).length,
      
      addNotification: (item) => {
        const newItem: NotificationItem = {
          ...item,
          id: `n-${Date.now()}`,
          read: false,
          time: new Date().toISOString()
        };
        set(state => {
          const list = [newItem, ...state.notifications];
          return {
            notifications: list,
            unreadCount: list.filter(n => !n.read).length
          };
        });
      },
      
      markRead: (id) => {
        set(state => {
          const list = state.notifications.map(n => n.id === id ? { ...n, read: true } : n);
          return {
            notifications: list,
            unreadCount: list.filter(n => !n.read).length
          };
        });
      },
      
      markUnread: (id) => {
        set(state => {
          const list = state.notifications.map(n => n.id === id ? { ...n, read: false } : n);
          return {
            notifications: list,
            unreadCount: list.filter(n => !n.read).length
          };
        });
      },
      
      markAllRead: () => {
        set(state => {
          const list = state.notifications.map(n => ({ ...n, read: true }));
          return {
            notifications: list,
            unreadCount: 0
          };
        });
      },
      
      deleteNotification: (id) => {
        set(state => {
          const list = state.notifications.filter(n => n.id !== id);
          return {
            notifications: list,
            unreadCount: list.filter(n => !n.read).length
          };
        });
      },
      
      addTask: (task) => {
        const newTask: TaskItem = {
          ...task,
          id: `t-${Date.now()}`,
          completed: false
        };
        set(state => ({
          tasks: [newTask, ...state.tasks]
        }));
      },
      
      completeTask: (id) => {
        set(state => ({
          tasks: state.tasks.map(t => t.id === id ? { ...t, completed: true } : t)
        }));
      }
    }),
    {
      name: 'gymflow-notifications',
      storage: createJSONStorage(() => mmkvStorage)
    }
  )
);
