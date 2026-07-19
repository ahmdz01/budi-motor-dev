'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { signIn } from '../actions/signIn';

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
      {error && <p className="text-sm text-danger-600">{error}</p>}
      <Button type="submit" isLoading={isPending}>
        Masuk
      </Button>
    </form>
  );
}