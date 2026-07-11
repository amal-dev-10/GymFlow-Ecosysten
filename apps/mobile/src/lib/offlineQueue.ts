import { MMKV } from 'react-native-mmkv';

// Dedicated MMKV instance for the offline mutation queue so it doesn't
// collide with the app/zustand stores.
const queueStorage = new MMKV({ id: 'gymflow-offline-queue' });

const QUEUE_KEY = 'mutations';

export interface QueuedMutation {
  id: string;
  type: 'create-member' | 'update-member' | 'create-membership' | 'update-membership' | 'freeze-membership' | 'check-in' | 'check-out' | 'create-membership-plan';
  payload: any;
  createdAt: string;
}

function readQueue(): QueuedMutation[] {
  const raw = queueStorage.getString(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedMutation[]): void {
  queueStorage.set(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueue(mutation: Omit<QueuedMutation, 'id' | 'createdAt'>): void {
  const queue = readQueue();
  queue.push({
    ...mutation,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  });
  writeQueue(queue);
}

export function peek(): QueuedMutation[] {
  return readQueue();
}

export function dequeue(id: string): void {
  writeQueue(readQueue().filter((m) => m.id !== id));
}

export function clearQueue(): void {
  queueStorage.delete(QUEUE_KEY);
}

export function queueSize(): number {
  return readQueue().length;
}

// --- Draft persistence (create-member form auto-save) ---

const DRAFT_KEY = 'member-draft';

export function saveDraft(data: any): void {
  queueStorage.set(DRAFT_KEY, JSON.stringify(data));
}

export function loadDraft(): any | null {
  const raw = queueStorage.getString(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  queueStorage.delete(DRAFT_KEY);
}
