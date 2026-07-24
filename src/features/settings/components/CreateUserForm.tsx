'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { useCurrentUser } from '@/shared/contexts/UserContext';
import { createUser } from '../actions/createUser';

const allRoles = [
  { value: 'kasir', label: 'Kasir' },
  { value: 'mekanik', label: 'Mekanik' },
  { value: 'admin', label: 'Admin' },
  { value: 'owner', label: 'Owner' },
  { value: 'super_admin', label: 'Super Admin' },
];

export function CreateUserForm() {
  const router = useRouter();
  const { roleCode: callerRole } = useCurrentUser();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const availableRoles =
    callerRole === 'admin'
      ? allRoles.filter((r) => ['kasir', 'mekanik'].includes(r.value))
      : allRoles;

  function handleSubmit(formData: FormData) {
    setError(null);

    const pin = formData.get('pin') as string;
    const confirmPin = formData.get('confirmPin') as string;

    if (pin !== confirmPin) {
      setError('Konfirmasi PIN tidak cocok.');
      return;
    }

    startTransition(async () => {
      const result = await createUser(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push('/settings/users');
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <Input id="name" name="name" label="Nama Lengkap" required />
      <Input
        id="phoneNumber"
        name="phoneNumber"
        label="Nomor HP"
        type="tel"
        inputMode="numeric"
        required
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="roleCode" className="text-sm font-medium text-neutral-700">
          Role
        </label>
        <select
          id="roleCode"
          name="roleCode"
          required
          className="focus:border-accent-500 focus:ring-accent-100 rounded-md border border-neutral-300 px-4 py-2.5 text-base focus:ring-2 focus:outline-none"
        >
          {availableRoles.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <Input
        id="pin"
        name="pin"
        label="PIN (4 digit)"
        type="password"
        inputMode="numeric"
        maxLength={4}
        required
      />
      <Input
        id="confirmPin"
        name="confirmPin"
        label="Konfirmasi PIN"
        type="password"
        inputMode="numeric"
        maxLength={4}
        required
      />

      {error && <p className="text-danger-600 text-sm">{error}</p>}

      <Button type="submit" isLoading={isPending}>
        Simpan Pengguna
      </Button>
    </form>
  );
}
