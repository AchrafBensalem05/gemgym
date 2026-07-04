/**
 * GemGym — React Query Client Configuration
 *
 * Centralized QueryClient with sensible defaults for a desktop app:
 * - No background refetching on window focus (offline-first)
 * - 5 minute stale time to reduce unnecessary Tauri IPC calls
 * - 3 retries with exponential backoff on failure
 */

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Desktop/offline-first: don't refetch when window regains focus
      refetchOnWindowFocus: false,
      // Data stays fresh for 5 minutes
      staleTime: 1000 * 60 * 5,
      // Keep unused queries in cache for 10 minutes
      gcTime: 1000 * 60 * 10,
      // Retry failed requests up to 3 times
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});
