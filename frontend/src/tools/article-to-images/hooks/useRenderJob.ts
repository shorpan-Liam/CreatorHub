import { useQuery } from '@tanstack/react-query';
import { getRender } from '../service';

export const activeStatuses = ['queued', 'running', 'cancel_requested'];
export function useRenderJob(id: string | undefined, active: boolean) {
  return useQuery({
    queryKey: ['renders', id],
    queryFn: ({ signal }) => getRender(id!, signal),
    enabled: !!id && active,
    staleTime: 0,
    refetchInterval: (query) =>
      activeStatuses.includes(query.state.data?.status || '') ? 1500 : false,
    refetchOnWindowFocus: true,
  });
}
