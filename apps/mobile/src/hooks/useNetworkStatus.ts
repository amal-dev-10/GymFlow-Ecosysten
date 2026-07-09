import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAppStore } from '../store/app.store';
import { peek, dequeue } from '../lib/offlineQueue';
import { membersApi } from '../lib/api';

export const useNetworkStatus = () => {
  const isOffline = useAppStore((state) => state.isOffline);
  const setOfflineStatus = useAppStore((state) => state.setOfflineStatus);

  useEffect(() => {
    // If running in browser/web context, we can use window listeners
    if (Platform.OS === 'web') {
      const handleOnline = () => setOfflineStatus(false);
      const handleOffline = () => setOfflineStatus(true);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
    
    // In native contexts, for a basic foundation, we assume online by default.
    // If NetInfo is installed later, this store/hook can be easily bridged.
  }, [setOfflineStatus]);

  useEffect(() => {
    if (!isOffline) {
      const flushQueue = async () => {
        const queue = peek();
        for (const item of queue) {
          try {
            if (item.type === 'check-in') {
              await membersApi.checkIn(item.payload.memberId, item.payload.gymId);
              dequeue(item.id);
            } else if (item.type === 'check-out') {
              await membersApi.checkOut(item.payload.memberId, item.payload.gymId);
              dequeue(item.id);
            }
          } catch (e) {
            console.error('Failed to sync offline mutation', item.id, e);
          }
        }
      };
      flushQueue();
    }
  }, [isOffline]);

  return {
    isOffline,
    setOfflineStatus,
  };
};
