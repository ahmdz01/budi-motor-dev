'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { requestPinReset } from '../actions/requestPinReset';

export function ForgotPinForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await requestPinReset(formData);
      setMessage(result.message);
    });
  }

  if (message) {
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
        <p className="text-sm text-neutral-700">{message}</p>
        <Link href="/login" className="text-accent-600 text-sm font-medium">
          Kembali ke Login
        </Link>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <p className="text-sm text-neutral-500">
        Masukkan nomor HP Anda. Owner atau Super Admin akan mengatur ulang PIN Anda dan menghubungi
        Anda langsung.
      </p>
      <Input
        id="phoneNumber"
        name="phoneNumber"
        label="Nomor HP"
        type="tel"
        inputMode="numeric"
        placeholder="081234567890"
        required
      />
      <Button type="submit" isLoading={isPending}>
        Kirim Permintaan
      </Button>
      <Link href="/login" className="text-center text-sm text-neutral-500 hover:text-neutral-700">
        Kembali ke Login
      </Link>
    </form>
  );
}
