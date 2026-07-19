/**
 * Bentuk baku sukses/gagal, dipakai di seluruh aplikasi — RPC call,
 * Server Action, validasi form, dll. Konsisten dengan prinsip
 * "satu pola dipakai berulang" (DRY) yang kita pegang sejak awal.
 */
export type Result<T> = { success: true; data: T } | { success: false; error: AppError };

export interface AppError {
  code: string;
  message: string; // Pesan yang AMAN ditampilkan ke pengguna (Bahasa Indonesia)
}

export function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

export function fail(code: string, message: string): Result<never> {
  return { success: false, error: { code, message } };
}
