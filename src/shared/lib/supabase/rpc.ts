import type { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, type Result } from '@/shared/types/result';
import { logger } from '@/shared/lib/logger';

const SENSITIVE_ARG_KEY =
  /phone|pin|password|token|secret|credential|authorization|ip_hash/i;

const SAFE_RPC_MESSAGES = new Set([
  'Akses ditolak.',
  'Akses ditolak: hanya Owner/Admin/Super Admin.',
  'Akses ditolak: hanya Owner/Admin/Kasir/Super Admin.',
  'Akses ditolak: hanya Owner/Admin/Kasir/Super Admin yang boleh menerima kendaraan servis.',
  'Akses ditolak: hanya Owner/Admin/Kasir/Super Admin yang boleh menugaskan mekanik.',
  'Akses ditolak: hanya mekanik yang ditugaskan atau Owner/Admin/Super Admin yang boleh menyelesaikan servis ini.',
  'Akses ditolak: hanya Owner/Admin/Super Admin yang boleh membatalkan servis.',
  'Akses ditolak: hanya Owner/Admin/Kasir/Super Admin yang boleh mengirim estimasi.',
  'Akses ditolak: hanya Owner/Admin/Kasir/Super Admin yang boleh mencatat keputusan pelanggan.',
  'Minimal 1 barang harus diisi.',
  'Total pembelian harus lebih dari 0.',
  'Jumlah dibayar tidak valid.',
  'Metode pembayaran tidak valid.',
  'Nominal pembayaran harus lebih dari 0.',
  'Data hutang tidak ditemukan.',
  'Nominal melebihi sisa hutang yang tercatat.',
  'Minimal 1 barang harus dicek.',
  'Stok fisik tidak boleh negatif.',
  'Harga beli wajib diisi untuk barang dengan selisih lebih.',
  'Stok sistem tidak konsisten untuk salah satu barang — batalkan dan coba lagi.',
  'Keranjang tidak boleh kosong.',
  'Tipe pelanggan tidak valid.',
  'Salah satu barang tidak memiliki harga untuk tipe pelanggan ini.',
  'Jumlah uang diterima kurang dari total belanja.',
  'Qty barang harus lebih dari 0.',
  'Harga tidak ditemukan untuk salah satu barang.',
  'Stok tidak cukup untuk salah satu barang saat transaksi diproses.',
  'Pelanggan wajib dipilih.',
  'Keluhan wajib diisi (minimal 3 karakter).',
  'Kendaraan tidak ditemukan.',
  'Kendaraan tidak terdaftar atas nama pelanggan ini.',
  'Servis tidak ditemukan.',
  'Mekanik wajib dipilih.',
  'Mekanik tidak valid.',
  'Alasan pembatalan wajib diisi (minimal 3 karakter).',
  'Item hanya bisa ditambahkan saat servis berstatus Dikerjakan.',
  'Tipe item tidak valid.',
  'Produk wajib dipilih.',
  'Harga tidak ditemukan untuk produk ini.',
  'Nama jasa wajib diisi (minimal 3 karakter).',
  'Harga jasa wajib diisi dan lebih dari 0.',
  'Stok tidak cukup untuk produk ini.',
  'Estimasi hanya bisa dikirim saat servis berstatus Dikerjakan.',
  'Tambahkan minimal 1 item sebelum mengirim estimasi.',
  'Servis ini tidak sedang menunggu persetujuan.',
  'Pembayaran hanya bisa dikonfirmasi saat servis berstatus Selesai.',
  'Servis ini belum memiliki item untuk ditagih.',
  'Retur harus merujuk salah satu item transaksi atau item servis, tidak keduanya/tidak dua-duanya.',
  'Retur harus merujuk tepat satu item transaksi atau item servis.',
  'Qty retur harus lebih dari 0.',
  'Jumlah refund tidak boleh negatif.',
  'Jumlah refund tidak boleh kosong atau negatif.',
  'Alasan retur wajib diisi (minimal 3 karakter).',
  'Item transaksi tidak ditemukan.',
  'Transaksi ini tidak berstatus Lunas.',
  'Item servis tidak ditemukan.',
  'Servis ini belum Lunas.',
  'Jenis entri tidak valid.',
  'Jumlah harus lebih dari 0.',
  'Keterangan wajib diisi (minimal 3 karakter).',
  'Tidak bisa mengubah role akun sendiri.',
  'Role tidak valid.',
  'Pengguna tidak ditemukan.',
  'Admin hanya boleh mengubah role akun Kasir/Mekanik.',
  'ID pengguna tidak valid.',
  'Refund melebihi batas transaksi besar. Minta Owner, Admin, atau Super Admin memprosesnya.',
  'Harga asli item tidak valid untuk diproses retur.',
]);

function redactSensitiveArgs(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSensitiveArgs);
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(
      ([key, nestedValue]) => [
        key,
        SENSITIVE_ARG_KEY.test(key)
          ? '[REDACTED]'
          : redactSensitiveArgs(nestedValue),
      ],
    ),
  );
}

function isSafeDynamicBusinessMessage(message: string): boolean {
  return [
    /^Transisi status dari [A-Za-z_ -]{1,40} ke [A-Za-z_ -]{1,40} tidak diizinkan\.$/,
    /^Qty retur melebihi sisa yang bisa diretur \(\d+(?:[.,]\d+)?\)\.$/,
    /^Jumlah penarikan melebihi saldo Dana Restock saat ini \(\d+(?:[.,]\d+)?\)\.$/,
    /^Jumlah refund melebihi batas maksimal retur ini\. Maksimal yang diizinkan: Rp [\d.,]+\.$/,
  ].some((pattern) => pattern.test(message));
}

function safeRpcErrorMessage(
  code: string | undefined,
  message: string | undefined,
): string {
  if (message && SAFE_RPC_MESSAGES.has(message)) {
    return message;
  }

  if (message && isSafeDynamicBusinessMessage(message)) {
    return message;
  }

  if (code === '42501') {
    return 'Akses ditolak. Anda tidak memiliki izin untuk melakukan tindakan ini.';
  }

  return 'Permintaan tidak dapat diproses. Periksa data dan coba lagi.';
}

/**
 * Wrapper generik untuk memanggil RPC Supabase.
 */
export async function callRpc<TArgs extends object, TReturn>(
  supabase: SupabaseClient,
  functionName: string,
  args: TArgs,
): Promise<Result<TReturn>> {
  const { data, error } = await supabase.rpc(functionName, args);

  if (error) {
    logger.error(`RPC gagal: ${functionName}`, {
      functionName,
      args: redactSensitiveArgs(args),
      supabaseErrorCode: error.code,
    });

    return fail(
      error.code ?? 'RPC_ERROR',
      safeRpcErrorMessage(error.code, error.message),
    );
  }

  return ok(data as TReturn);
}
