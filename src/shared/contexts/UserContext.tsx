'use client';

import { createContext, useContext } from 'react';
import type { CurrentUser } from '@/features/auth/lib/getCurrentUser';

const UserContext = createContext<CurrentUser | null>(null);

/**
 * Menyediakan data pengguna yang login ke seluruh Client Component
 * di bawahnya — supplied dari Server Component (MainLayout, yang
 * sudah memanggil getCurrentUser()), dibaca lewat useCurrentUser()
 * di komponen mana pun yang butuh, tanpa perlu prop drilling atau
 * query ulang ke database.
 */
export function UserProvider({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

/**
 * Hook untuk membaca data pengguna di Client Component.
 * Melempar error jika dipanggil di luar UserProvider — ini
 * SENGAJA (fail-fast), karena seluruh halaman di route group
 * (main) sudah pasti berada di dalam UserProvider (dipasang di
 * MainLayout). Kalau hook ini return null diam-diam, bug "role
 * tidak terbaca" akan sulit dilacak; dengan throw, error langsung
 * terlihat jelas saat development.
 */
export function useCurrentUser(): CurrentUser {
  const user = useContext(UserContext);

  if (!user) {
    throw new Error(
      'useCurrentUser() dipanggil di luar UserProvider. Pastikan komponen ini berada di dalam route group (main).'
    );
  }

  return user;
}
