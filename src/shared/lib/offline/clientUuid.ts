/**
 * Generator client_uuid — dipakai di SELURUH entity yang mendukung
 * offline sync sesuai Data Dictionary v3 (transactions.client_uuid,
 * services.client_uuid, purchases.client_uuid).
 *
 * PENTING: UUID ini dibuat di CLIENT (browser) saat data pertama
 * dibuat — BUKAN menunggu ID dari server. Ini yang memungkinkan
 * transaksi tetap bisa dibuat saat offline (BR-SYNC-01), dan
 * mencegah duplikasi data saat sinkronisasi diulang (idempotency).
 */
export function generateClientUuid(): string {
  return crypto.randomUUID();
}
