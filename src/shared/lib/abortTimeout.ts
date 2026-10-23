export interface AbortTimeout {
  controller: AbortController;
  clear: () => void;
}

/**
 * Membuat AbortController yang otomatis membatalkan request
 * setelah batas waktu yang ditentukan.
 */
export function createAbortTimeout(
  timeoutMs: number,
): AbortTimeout {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error('Timeout harus berupa angka positif.');
  }

  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return {
    controller,
    clear: () => clearTimeout(timeoutId),
  };
}