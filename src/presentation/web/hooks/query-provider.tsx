'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Avoid refetching immediately on mount when initialData is provided
        staleTime: 2_000,
        // Keep previous data visible while fetching new data
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function AppQueryProvider({ children }: { children: ReactNode }) {
  // Create the QueryClient once per component lifecycle (not on every render)
  // eslint-disable-next-line react/hook-use-state -- setter intentionally unused; lazy init pattern
  const [queryClient] = useState(makeQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
