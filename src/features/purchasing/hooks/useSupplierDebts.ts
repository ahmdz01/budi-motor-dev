'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';
import type { SupplierDebt } from '../types';

export function useSupplierDebts(supplierId: string) {
  return useQuery({
    queryKey: ['supplier-debts', supplierId],
    queryFn: async (): Promise<SupplierDebt[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('supplier_debts')
        .select('id, purchase_id, total_tagihan, total_dibayar, sisa_hutang, due_date, status')
        .eq('supplier_id', supplierId)
        .eq('status', 'unpaid')
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data as SupplierDebt[];
    },
    enabled: !!supplierId,
  });
}