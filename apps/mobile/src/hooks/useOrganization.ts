import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orgApi, UpdateOrganizationPayload } from '../lib/api';
import { useWorkspaceStore } from '../store/workspace.store';

// The org list already carries the full org record (getUserOrganizations spreads
// it), so we reuse it as the source for the active organization's settings.
export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations', 'list'],
    queryFn: () => orgApi.list(),
  });
}

export function useActiveOrganization() {
  const activeOrganizationId = useWorkspaceStore((s) => s.activeOrganizationId);
  const query = useOrganizations();
  const org = query.data?.find((o) => o.id === activeOrganizationId) || null;
  return { ...query, org };
}

export function useUpdateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateOrganizationPayload }) => orgApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations', 'list'] });
    },
  });
}
