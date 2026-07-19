import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/features/auth/lib/getCurrentUser';
import { BottomNav } from '@/shared/components/BottomNav';
import { LogoutButton } from '@/shared/components/LogoutButton';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  // Jaring pengaman kedua — middleware seharusnya sudah mencegah ini,
  // tapi tetap kita cek di sini juga (defense-in-depth yang sama
  // dengan prinsip RLS di database: jangan bergantung 1 lapisan saja).
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
        <p className="text-sm text-neutral-600">
          Halo, <span className="font-medium text-neutral-900">{user.name}</span>
        </p>
        <LogoutButton />
      </header>

      <main className="pb-20">{children}</main>

      <BottomNav roleCode={user.roleCode} />
    </div>
  );
}
