'use client';

import { useEffect } from 'react';
import { logger } from '@/shared/lib/logger';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('Error KRITIS di Root Layout', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  // global-error.tsx WAJIB menyertakan <html> dan <body> sendiri,
  // karena ia menggantikan Root Layout yang gagal render —
  // ini satu-satunya error.tsx di seluruh app yang perlu tag ini.
  return (
    <html lang="id">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
          <h2 className="text-lg font-semibold">Aplikasi Mengalami Masalah</h2>
          <p className="text-sm text-neutral-500">
            Silakan muat ulang halaman. Jika masalah berlanjut, hubungi Super Admin.
          </p>
          <button onClick={reset} className="bg-accent-600 rounded-md px-6 py-3 text-white">
            Muat Ulang
          </button>
        </div>
      </body>
    </html>
  );
}
