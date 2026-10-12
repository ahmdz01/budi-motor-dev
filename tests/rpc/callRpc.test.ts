import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

vi.mock('@/shared/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

import { callRpc } from '@/shared/lib/supabase/rpc';
import { logger } from '@/shared/lib/logger';

const rpc = vi.fn();
const supabase = { rpc } as unknown as SupabaseClient;

describe('callRpc', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('menyamarkan nomor telepon saat RPC gagal', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: {
        code: 'PGRST000',
        message: 'Database error',
      },
    });

    const result = await callRpc(
      supabase,
      'request_pin_reset',
      {
        p_phone_number: '081234567890',
        p_request_id: 'test-request',
      },
    );

    expect(result).toMatchObject({
      success: false,
      error: { code: 'PGRST000' },
    });

    expect(logger.error).toHaveBeenCalledWith(
      'RPC gagal: request_pin_reset',
      {
        functionName: 'request_pin_reset',
        args: {
          p_phone_number: '[REDACTED]',
          p_request_id: 'test-request',
        },
        supabaseErrorCode: 'PGRST000',
      },
    );

    expect(
      JSON.stringify(vi.mocked(logger.error).mock.calls),
    ).not.toContain('081234567890');
  });

  it('mengembalikan data ketika RPC berhasil', async () => {
    rpc.mockResolvedValueOnce({
      data: { accepted: true },
      error: null,
    });

    const result = await callRpc(
      supabase,
      'example_rpc',
      { p_id: 'test-id' },
    );

    expect(result).toEqual({
      success: true,
      data: { accepted: true },
    });

    expect(logger.error).not.toHaveBeenCalled();
  });

  it('tidak membocorkan pesan error database yang tidak dikenal', async () => {
  rpc.mockResolvedValueOnce({
    data: null,
    error: {
      code: 'XX000',
      message: 'internal database detail',
    },
  });

  const result = await callRpc(
    supabase,
    'example_rpc',
    { p_id: 'test-id' },
  );

  expect(result).toEqual({
    success: false,
    error: {
      code: 'XX000',
      message: 'Permintaan tidak dapat diproses. Periksa data dan coba lagi.',
    },
  });

  expect(logger.error).toHaveBeenCalledWith(
    'RPC gagal: example_rpc',
    {
      functionName: 'example_rpc',
      args: { p_id: 'test-id' },
      supabaseErrorCode: 'XX000',
    },
  );

  expect(
    JSON.stringify(vi.mocked(logger.error).mock.calls),
  ).not.toContain('internal database detail');
});

it('tetap menampilkan pesan bisnis yang dikenal', async () => {
  rpc.mockResolvedValueOnce({
    data: null,
    error: {
      code: '22023',
      message: 'Stok tidak cukup untuk salah satu barang saat transaksi diproses.',
    },
  });

  const result = await callRpc(
    supabase,
    'sp_create_pos_transaction',
    { p_items: [] },
  );

  expect(result).toEqual({
    success: false,
    error: {
      code: '22023',
      message: 'Stok tidak cukup untuk salah satu barang saat transaksi diproses.',
    },
  });
});
});
