'use client';

import { use } from 'react';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { useUserDetail } from '@/features/settings/hooks/useUserDetail';
import { ChangeRoleForm } from '@/features/settings/components/ChangeRoleForm';

const roleLabel: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  kasir: 'Kasir',
  mekanik: 'Mekanik',
  super_admin: 'Super Admin',
};

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: user, isLoading, error } = useUserDetail(id);

  if (isLoading) return <div className="p-4 text-sm text-neutral-400">Memuat...</div>;
  if (error || !user)
    return <div className="text-danger-600 p-4 text-sm">Pengguna tidak ditemukan.</div>;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">{user.name}</h1>
        <p className="text-sm text-neutral-500">{user.phone_number}</p>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="accent">{roleLabel[user.role_code] ?? user.role_code}</Badge>
        <Badge variant={user.status === 'active' ? 'success' : 'danger'}>
          {user.status === 'active' ? 'Aktif' : 'Nonaktif'}
        </Badge>
      </div>

      {user.last_login_at && (
        <p className="text-xs text-neutral-500">
          Login terakhir: {new Date(user.last_login_at).toLocaleString('id-ID')}
        </p>
      )}

      <Card className="flex flex-col gap-3 p-4">
        <ChangeRoleForm user={user} />
      </Card>
    </div>
  );
}
