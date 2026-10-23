import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { createAbortTimeout } from '@/shared/lib/abortTimeout';

describe('createAbortTimeout', () => {
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('membatalkan request setelah batas waktu', () => {
    vi.useFakeTimers();

    const timeout = createAbortTimeout(15_000);

    expect(timeout.controller.signal.aborted).toBe(false);

    vi.advanceTimersByTime(14_999);

    expect(timeout.controller.signal.aborted).toBe(false);

    vi.advanceTimersByTime(1);

    expect(timeout.controller.signal.aborted).toBe(true);

    timeout.clear();
  });

  it('tidak membatalkan request jika timer dibersihkan lebih dahulu', () => {
    vi.useFakeTimers();

    const timeout = createAbortTimeout(15_000);

    timeout.clear();

    vi.advanceTimersByTime(15_000);

    expect(timeout.controller.signal.aborted).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('menolak nilai timeout yang tidak valid', () => {
    expect(() => createAbortTimeout(0)).toThrow(
      'Timeout harus berupa angka positif.',
    );

    expect(() => createAbortTimeout(-1)).toThrow(
      'Timeout harus berupa angka positif.',
    );
  });
});