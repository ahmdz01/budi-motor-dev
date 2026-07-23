import Link from 'next/link';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import type { UserListItem as UserListItemType } from '../hooks/useUsers';

const roleLabel: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  kasir: 'Kasir',
  mekanik: 'Mekanik',
  super_admin: 'Super Admin',
};

export function UserListItem({ user }: { user: UserListItemType }) {
  return (
    <Link href={`/settings/users/${user.id}`}>
      <Card className="flex items-center justify-between p-3 active:bg-neutral-50">
        <div>
          <p className="text-sm font-medium text-neutral-900">{user.name}</p>
          <p className="text-xs text-neutral-500">{user.phone_number}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant="accent">{roleLabel[user.role_code] ?? user.role_code}</Badge>
          {user.status === 'inactive' && <Badge variant="danger">Nonaktif</Badge>}
        </div>
      </Card>
    </Link>
  );
}
