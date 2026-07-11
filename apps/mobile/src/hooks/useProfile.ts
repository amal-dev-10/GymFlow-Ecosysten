import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../lib/api';
import { useAuthStore } from '../store/auth.store';

// ---------------------------------------------------------------------------
// The signed-in user's own profile. getMe is the source of truth (role, org,
// gym, verified phone); we mirror it into the persisted auth store so the rest
// of the app stays in sync.
// ---------------------------------------------------------------------------
export function useMe() {
  const updateUser = useAuthStore((s) => s.updateUser);
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await authApi.getMe();
      if (res?.user) updateUser(res.user);
      return res.user;
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const updateUser = useAuthStore((s) => s.updateUser);
  return useMutation({
    mutationFn: (payload: { fullName: string; email: string }) => authApi.updateProfile(payload),
    onSuccess: (res: any) => {
      if (res?.user) updateUser(res.user);
      qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
