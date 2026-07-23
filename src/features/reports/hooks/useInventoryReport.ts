'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';
import type { DateRange, InventoryReportSummary, LowStockRow, StockMovementRow } from '../types';

export function useInventoryReportSummary() {
  return useQuery({
    queryKey: ['inventory-report-summary'],
    queryFn: async (): Promise<InventoryReportSummary> => {
      const supabase = createClient();

      const { data: products, error: productsError } = await supabase
        .from('product_list_view')
        .select('id, total_stock, min_stock')
        .eq('status', 'active');

      if (productsError) throw productsError;

      const lowStockCount = products.filter(
        (p) => p.total_stock > 0 && p.total_stock <= p.min_stock
      ).length;
      const outOfStockCount = products.filter((p) => p.total_stock === 0).length;

      const { data: batches, error: batchesError } = await supabase
        .from('inventory_batches')
        .select('qty_sisa, harga_beli')
        .eq('status', 'active');

      if (batchesError) throw batchesError;

      const totalInventoryValue = batches.reduce((sum, b) => sum + b.qty_sisa * b.harga_beli, 0);

      return {
        totalProducts: products.length,
        lowStockCount,
        outOfStockCount,
        totalInventoryValue,
      };
    },
    // Kondisi stok "saat ini" — cukup segar 30 detik, sama seperti
    // default global (bukan snapshot historis, tidak butuh staleTime
    // khusus seperti laporan periode lainnya).
  });
}

export function useLowStockList() {
  return useQuery({
    queryKey: ['low-stock-list'],
    queryFn: async (): Promise<LowStockRow[]> => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('product_list_view')
        .select('id, name, category_name, total_stock, min_stock')
        .eq('status', 'active')
        .order('total_stock', { ascending: true });

      if (error) throw error;

      return data
        .filter((p) => p.total_stock <= p.min_stock)
        .map((p) => ({
          productId: p.id,
          name: p.name,
          categoryName: p.category_name,
          totalStock: p.total_stock,
          minStock: p.min_stock,
        }));
    },
  });
}

export function useStockMovement(range: DateRange) {
  return useQuery({
    queryKey: ['stock-movement', range.from, range.to],
    queryFn: async (): Promise<StockMovementRow[]> => {
      const supabase = createClient();

      // Barang masuk: dari purchase_items dalam rentang tanggal
      // (created_at, bukan purchase_date, supaya konsisten dengan
      // filter periode "created_at" yang dipakai laporan lain).
      const { data: purchaseItems, error: purchaseError } = await supabase
        .from('purchase_items')
        .select('product_id, qty, products(name), created_at')
        .gte('created_at', `${range.from}T00:00:00`)
        .lte('created_at', `${range.to}T23:59:59`);

      if (purchaseError) throw purchaseError;

      // Barang keluar: dari stock_consumptions, JOIN ke batch untuk
      // dapat product_id (tabel ini tidak simpan product_id langsung).
      const { data: consumptions, error: consumptionError } = await supabase
        .from('stock_consumptions')
        .select('qty, created_at, inventory_batches(product_id, products(name))')
        .gte('created_at', `${range.from}T00:00:00`)
        .lte('created_at', `${range.to}T23:59:59`);

      if (consumptionError) throw consumptionError;

      const movementMap = new Map<string, StockMovementRow>();

      for (const item of purchaseItems) {
        const name = (item.products as unknown as { name: string } | null)?.name ?? '-';
        const existing = movementMap.get(item.product_id) ?? {
          productId: item.product_id,
          name,
          qtyIn: 0,
          qtyOut: 0,
        };
        existing.qtyIn += item.qty;
        movementMap.set(item.product_id, existing);
      }

      for (const c of consumptions) {
        const batch = c.inventory_batches as unknown as {
          product_id: string;
          products: { name: string } | null;
        } | null;
        if (!batch) continue;

        const productId = batch.product_id;
        const name = batch.products?.name ?? '-';
        const existing = movementMap.get(productId) ?? {
          productId,
          name,
          qtyIn: 0,
          qtyOut: 0,
        };
        // qty di stock_consumptions bisa negatif untuk retur (BR-FIFO-03)
        // — retur berarti barang KEMBALI, jadi dikurangkan dari "keluar",
        // bukan ditambah sebagai keluar lagi.
        if (c.qty > 0) {
          existing.qtyOut += c.qty;
        } else {
          existing.qtyOut += c.qty; // otomatis mengurangi karena negatif
        }
        movementMap.set(productId, existing);
      }

      return Array.from(movementMap.values()).sort((a, b) => b.qtyOut - a.qtyOut);
    },
  });
}
