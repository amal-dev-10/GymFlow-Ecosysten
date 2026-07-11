import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { announcementsApi } from '../lib/api';

export const announcementKeys = {
  all: ['announcements'] as const,
  list: () => [...announcementKeys.all, 'list'] as const,
};

export function useAnnouncements() {
  return useQuery({
    queryKey: announcementKeys.list(),
    queryFn: () => announcementsApi.list(),
  });
}

export function useMarkAnnouncementRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => announcementsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: announcementKeys.all }),
  });
}

export function useMarkAllAnnouncementsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => announcementsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: announcementKeys.all }),
  });
}
