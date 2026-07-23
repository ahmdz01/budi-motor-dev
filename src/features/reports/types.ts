export type DateRangePreset = 'today' | 'week' | 'month' | 'custom';

export interface DateRange {
  from: string; // ISO date, format 'YYYY-MM-DD'
  to: string;
}

export interface SalesReportSummary {
  totalOmzet: number;
  totalLaba: number;
  posOmzet: number;
  posLaba: number;
  serviceOmzet: number;
  serviceLaba: number;
  transactionCount: number;
}

export interface DailyBreakdownRow {
  date: string;
  omzet: number;
  laba: number;
}

export interface ServiceReportSummary {
  totalServices: number;
  countByStatus: Record<string, number>;
  totalOmzet: number;
  avgCompletionHours: number | null;
  warrantyClaimCount: number;
}

export interface MechanicPerformanceRow {
  mechanicId: string;
  mechanicName: string;
  serviceCount: number;
}

export interface InventoryReportSummary {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalInventoryValue: number;
}

export interface LowStockRow {
  productId: string;
  name: string;
  categoryName: string | null;
  totalStock: number;
  minStock: number;
}

export interface StockMovementRow {
  productId: string;
  name: string;
  qtyIn: number;
  qtyOut: number;
}
