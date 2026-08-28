import {QueryClient} from '@tanstack/react-query';
import type {Result} from '@/lib/data';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

/** Stable query keys for domain lists. */
export const queryKeys = {
  quotes: (userId: string) => ['quotes', userId] as const,
  clients: (userId: string) => ['clients', userId] as const,
  jobs: (userId: string) => ['jobs', userId] as const,
  allForUser: (userId: string) =>
    [queryKeys.quotes(userId), queryKeys.clients(userId), queryKeys.jobs(userId)] as const,
};

/** Turn data-layer Result into a thrown Error for React Query. */
export async function fromResult<T>(promise: Promise<Result<T>>): Promise<T> {
  const result = await promise;
  if (!result.ok) {
    throw new Error(result.error || 'Request failed');
  }
  return result.data;
}
