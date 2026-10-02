// Adapted from fastapi/full-stack-fastapi-template (MIT).
import { QueryClient } from '@tanstack/react-query';
import { APIError } from '../client/request';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (attempt, error) => !(error instanceof APIError && error.status < 500) && attempt < 2,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});
