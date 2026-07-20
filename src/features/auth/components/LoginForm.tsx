'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { signIn } from '../actions/signIn';
import Link from 'next/link';

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await signIn(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form action={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <Input
        id="phoneNumber"
        name="phoneNumber"
        label="Nomor HP"
        type="tel"
        inputMode="numeric"
        placeholder="081234567890"
        autoComplete="tel"
        required
      />
      <Input
        id="pin"
        name="pin"
        label="PIN"
        type="password"
        inputMode="numeric"
        maxLength={4}
        placeholder="••••"
        autoComplete="current-password"
        required
      />
      {error && <p className="text-danger-600 text-sm">{error}</p>}
      <Button type="submit" isLoading={isPending}>
        Masuk
      </Button>
      <Link
        href="/forgot-pin"
        className="text-center text-sm text-neutral-500 hover:text-neutral-700"
      >
        Lupa PIN?
      </Link>
    </form>
  );
}
