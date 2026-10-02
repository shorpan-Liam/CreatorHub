import { useQuery } from '@tanstack/react-query';
import { getTools } from './service';

export function useCatalog() {
  return useQuery({ queryKey: ['tools'], queryFn: ({ signal }) => getTools(signal) });
}
