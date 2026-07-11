import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supportApi, SupportTicketDetail } from '../lib/api';

// ---------------------------------------------------------------------------
// Support tickets — the gym's helpdesk with GymFlow. Org scoping happens on the
// backend via the x-organization-id header, so no org argument is needed here.
// ---------------------------------------------------------------------------
export const supportKeys = {
  all: ['support'] as const,
  lists: () => [...supportKeys.all, 'list'] as const,
  list: (status?: string) => [...supportKeys.lists(), status || 'all'] as const,
  detail: (id: string) => [...supportKeys.all, 'detail', id] as const,
};

export function useSupportTickets(status?: 'open' | 'closed') {
  return useQuery({
    queryKey: supportKeys.list(status),
    queryFn: () => supportApi.listTickets(status),
  });
}

export function useSupportTicket(id: string) {
  return useQuery({
    queryKey: supportKeys.detail(id),
    queryFn: () => supportApi.getTicket(id),
    enabled: !!id,
  });
}

export function useCreateSupportTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { subject: string; description?: string; priority?: string; category?: string }) =>
      supportApi.createTicket(payload),
    onSuccess: (ticket) => {
      qc.invalidateQueries({ queryKey: supportKeys.lists() });
      if (ticket?.id) qc.setQueryData(supportKeys.detail(ticket.id), ticket);
    },
  });
}

export function usePostSupportMessage(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => supportApi.postMessage(ticketId, body),
    onSuccess: (ticket: SupportTicketDetail) => {
      qc.setQueryData(supportKeys.detail(ticketId), ticket);
      qc.invalidateQueries({ queryKey: supportKeys.lists() });
    },
  });
}

export function useSupportCsat(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ score, comment }: { score: number; comment?: string }) =>
      supportApi.recordCsat(ticketId, score, comment),
    onSuccess: (ticket: SupportTicketDetail) => {
      qc.setQueryData(supportKeys.detail(ticketId), ticket);
      qc.invalidateQueries({ queryKey: supportKeys.lists() });
    },
  });
}
