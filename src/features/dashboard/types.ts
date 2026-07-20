export interface DashboardMetrics {
  kas_hari_ini: number;
  dana_restock_total: number;
  laba_hari_ini: number;
  barang_menipis_count: number;
  servis_berjalan_count: number;
  hutang_jatuh_tempo_total: number;
}

export interface RecentTransaction {
  id: string;
  total_amount: number;
  payment_method: string;
  source: string;
  created_at: string;
}
