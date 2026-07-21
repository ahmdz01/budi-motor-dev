'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';
import { callRpc } from '@/shared/lib/supabase/rpc';

interface PayDebtInput {
  debtId: string;
  amount: number;
  paymentMethod: 'cash' | 'transfer';
  supplierId: string;
}

export function usePaySupplierDebt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PayDebtInput) => {
      const supabase = createClient();

      const result = await callRpc<
        {
          p_debt_id: string;
          p_amount: number;
          p_payment_method: string;
        },
        {
          remaining: number;
          new_status: string;
        }[]
      >(
        supabase,
        'sp_pay_supplier_debt',
        {
          p_debt_id: input.debtId,
          p_amount: input.amount,
          p_payment_method: input.paymentMethod,
        }
      );

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.data[0];
    },

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['supplier-debts', variables.supplierId],
      });

      queryClient.invalidateQueries({
        queryKey: ['dashboard-metrics'],
      });
    },
  });
}