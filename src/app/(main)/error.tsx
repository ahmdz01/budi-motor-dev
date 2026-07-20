'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { logger } from '@/shared/lib/logger';

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('Error tertangkap di route (main)', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-4 text-center">
      <div className="bg-danger-100 rounded-full p-3">
        <AlertTriangle className="text-danger-600" size={28} />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Terjadi Kesalahan</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Maaf, ada masalah saat memuat halaman ini. Silakan coba lagi.
        </p>
      </div>
      <Button onClick={reset} variant="primary">
        Coba Lagi
      </Button>
    </div>
  );
}
