'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createClient } from '@/shared/lib/supabase/client';
import { callRpc } from '@/shared/lib/supabase/rpc';

export type ManualEntryType = 'restock_deposit' | 'restock_withdrawal' | 'operational_expense';

interface RecordManualEntryInput {
  entryType: ManualEntryType;
  amount: number;
  description: string;
  fromCash: boolean;
}

interface RecordManualLedgerEntryParams {
  p_entry_type: string;
  p_amount: number;
  p_description: string;
  p_from_cash: boolean;
}

interface RecordManualLedgerEntryResult {
  entry_ids: string[];
}

export function useRecordManualLedgerEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RecordManualEntryInput) => {
      const supabase = createClient();

      const result = await callRpc<RecordManualLedgerEntryParams, RecordManualLedgerEntryResult[]>(
        supabase,
        'sp_record_manual_ledger_entry',
        {
          p_entry_type: input.entryType,
          p_amount: input.amount,
          p_description: input.description,
          p_from_cash: input.fromCash,
        }
      );

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.data[0];
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['dashboard-metrics'],
      });
    },
  });
}
