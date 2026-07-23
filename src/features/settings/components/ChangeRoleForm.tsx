'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/Button';
import { useCurrentUser } from '@/shared/contexts/UserContext';
import { useUpdateUserRole } from '../hooks/useUpdateUserRole';
import type { UserListItem } from '../hooks/useUsers';

const allRoles = [
  { value: 'kasir', label: 'Kasir' },
  { value: 'mekanik', label: 'Mekanik' },
  { value: 'admin', label: 'Admin' },
  { value: 'owner', label: 'Owner' },
  { value: 'super_admin', label: 'Super Admin' },
];

export function ChangeRoleForm({ user }: { user: UserListItem }) {
  const { roleCode: callerRole, id: callerId } = useCurrentUser();
  const [selectedRole, setSelectedRole] = useState(user.role_code);
  const updateRole = useUpdateUserRole();

  const isSelf = user.id === callerId;
  const isAdminCaller = callerRole === 'admin';

  if (isSelf) {
    return (
      <p className="text-sm text-neutral-400">
        Anda tidak bisa mengubah role akun sendiri. Minta Owner/Admin lain untuk melakukannya.
      </p>
    );
  }

  if (isAdminCaller && !['kasir', 'mekanik'].includes(user.role_code)) {
    return (
      <p className="text-sm text-neutral-400">
        Hanya Owner/Super Admin yang boleh mengubah role akun ini.
      </p>
    );
  }

  const availableRoles = isAdminCaller
    ? allRoles.filter((r) => ['kasir', 'mekanik'].includes(r.value))
    : allRoles;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="newRole" className="text-sm font-medium text-neutral-700">
          Ubah Role
        </label>
        <select
          id="newRole"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as 'owner' | 'admin' | 'kasir' | 'mekanik' | 'super_admin')}
          className="focus:border-accent-500 focus:ring-accent-100 rounded-md border border-neutral-300 px-4 py-2.5 text-base focus:ring-2 focus:outline-none"
        >
          {availableRoles.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {updateRole.error && <p className="text-danger-600 text-sm">{updateRole.error.message}</p>}
      {updateRole.isSuccess && (
        <p className="text-success-600 text-sm">
          Role berhasil diubah. Pengguna perlu login ulang supaya perubahan berlaku.
        </p>
      )}

      <Button
        isLoading={updateRole.isPending}
        disabled={selectedRole === user.role_code}
        onClick={() => updateRole.mutate({ userId: user.id, newRole: selectedRole })}
      >
        Simpan Perubahan Role
      </Button>
    </div>
  );
}
