import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/features/auth/lib/getCurrentUser';
import { OfflineSyncManager } from '@/features/pos/components/OfflineSyncManager';
import { PendingSyncBadge } from '@/features/pos/components/PendingSyncBadge';
import { BottomNav } from '@/shared/components/BottomNav';
import { LogoutButton } from '@/shared/components/LogoutButton';
import { OfflineIndicator } from '@/shared/components/OfflineIndicator';
import { UserProvider } from '@/shared/contexts/UserContext';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <UserProvider user={user}>
      <div className="min-h-screen bg-neutral-50">
        <OfflineSyncManager />
        <OfflineIndicator />
        <PendingSyncBadge />

        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
          <p className="text-sm text-neutral-600">
            Halo, <span className="font-medium text-neutral-900">{user.name}</span>
          </p>
          <LogoutButton />
        </header>

        <main className="pb-20">{children}</main>

        <BottomNav roleCode={user.roleCode} />
      </div>
    </UserProvider>
  );
}
