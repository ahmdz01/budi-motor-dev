'use client';

import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@/shared/lib/queryClient';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // useState (bukan variable biasa di luar komponen) memastikan
  // setiap USER session dapat instance QueryClient sendiri di server
  // — penting untuk Next.js App Router, mencegah data 1 pengguna
  // "bocor" ke cache pengguna lain saat di-render di server.
  const [queryClient] = useState(() => createQueryClient());

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
