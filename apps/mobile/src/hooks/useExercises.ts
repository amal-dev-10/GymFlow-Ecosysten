import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { exercisesApi } from '../lib/api';

// Real Training Studio exercise library. Infinite list with search + category.
export function useExercises(search: string, category: string) {
  return useInfiniteQuery({
    queryKey: ['exercises', search, category],
    queryFn: ({ pageParam = 1 }) => exercisesApi.list({ search, category, page: pageParam, limit: 20 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  });
}

export function useExercise(id: string) {
  return useQuery({
    queryKey: ['exercise', id],
    queryFn: () => exercisesApi.get(id),
    enabled: !!id,
  });
}
