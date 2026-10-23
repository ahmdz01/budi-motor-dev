import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

vi.mock('@/shared/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

import {
  callIdempotentRpc,
  callRpc,
} from '@/shared/lib/supabase/rpc';
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


describe('callIdempotentRpc', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mengulang sekali setelah 23505 dan mempertahankan UUID serta parameter yang sama', async () => {
    const args = {
      p_client_uuid: 'stable-client-uuid',
      p_value: 'test',
    };

    rpc
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: '23505',
          message: 'duplicate key value violates unique constraint',
        },
      })
      .mockResolvedValueOnce({
        data: [{ transaction_id: 'existing-transaction-id' }],
        error: null,
      });

    const result = await callIdempotentRpc(
      supabase,
      'sp_create_pos_transaction',
      args,
    );

    expect(result).toEqual({
      success: true,
      data: [{ transaction_id: 'existing-transaction-id' }],
    });

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenNthCalledWith(
      1,
      'sp_create_pos_transaction',
      args,
    );
    expect(rpc).toHaveBeenNthCalledWith(
      2,
      'sp_create_pos_transaction',
      args,
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('tidak mengulang RPC ketika terjadi error bisnis selain 23505', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: {
        code: '22023',
        message:
          'Stok tidak cukup untuk salah satu barang saat transaksi diproses.',
      },
    });

    const result = await callIdempotentRpc(
      supabase,
      'sp_create_pos_transaction',
      {
        p_client_uuid: 'stable-client-uuid',
        p_items: [],
      },
    );

    expect(result).toMatchObject({
      success: false,
      error: {
        code: '22023',
        message:
          'Stok tidak cukup untuk salah satu barang saat transaksi diproses.',
      },
    });

    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('berhenti setelah percobaan kedua juga gagal dengan 23505', async () => {
    rpc
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: '23505',
          message: 'duplicate key value violates unique constraint',
        },
      })
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: '23505',
          message: 'duplicate key value violates unique constraint',
        },
      });

    const result = await callIdempotentRpc(
      supabase,
      'sp_create_pos_transaction',
      { p_client_uuid: 'stable-client-uuid' },
    );

    expect(result).toMatchObject({
      success: false,
      error: { code: '23505' },
    });

    expect(rpc).toHaveBeenCalledTimes(2);
  });
});

describe('callRpc AbortSignal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('meneruskan AbortSignal ke request Supabase', async () => {
    const controller = new AbortController();

    const abortSignal = vi.fn().mockResolvedValue({
      data: { accepted: true },
      error: null,
    });

    rpc.mockReturnValueOnce({ abortSignal });

    const result = await callRpc(
      supabase,
      'example_rpc',
      { p_id: 'test-id' },
      { signal: controller.signal },
    );

    expect(abortSignal).toHaveBeenCalledWith(controller.signal);

    expect(result).toEqual({
      success: true,
      data: { accepted: true },
    });
  });
});

});
