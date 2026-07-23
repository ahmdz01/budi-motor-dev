'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { UserListItem } from '@/features/settings/components/UserListItem';
import { useUsers } from '@/features/settings/hooks/useUsers';

export default function UsersPage() {
  const { data: users, isLoading, error } = useUsers();

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Pengguna</h1>
        <Link href="/settings/users/new">
          <Button size="md">
            <Plus size={16} /> Tambah
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
      )}

      {error && <p className="text-danger-600 text-sm">Gagal memuat daftar pengguna.</p>}

      {users && users.length === 0 && (
        <p className="text-center text-sm text-neutral-400">Belum ada pengguna terdaftar.</p>
      )}

      {users && users.length > 0 && (
        <div className="space-y-2">
          {users.map((u) => (
            <UserListItem key={u.id} user={u} />
          ))}
        </div>
      )}
    </div>
  );
}
