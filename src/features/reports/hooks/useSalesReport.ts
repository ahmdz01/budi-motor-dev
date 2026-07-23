'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';
import type { DateRange, DailyBreakdownRow, SalesReportSummary } from '../types';

interface TransactionWithLedger {
  source: string;
  total_amount: number;
  ledger_profit: number;
}

export function useSalesReport(range: DateRange) {
  return useQuery({
    queryKey: ['sales-report', range.from, range.to],
    queryFn: async (): Promise<SalesReportSummary> => {
      const supabase = createClient();

      // Ambil transaksi dalam rentang, plus profit terkait dari ledger
      // (per-transaksi, bukan agregat) supaya breakdown POS vs Servis
      // bisa dihitung akurat di sisi client.
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('id, source, total_amount')
        .eq('status', 'paid')
        .gte('created_at', `${range.from}T00:00:00`)
        .lte('created_at', `${range.to}T23:59:59`);

      if (txError) throw txError;

      const txIds = transactions.map((t) => t.id);

      if (txIds.length === 0) {
        return {
          totalOmzet: 0,
          totalLaba: 0,
          posOmzet: 0,
          posLaba: 0,
          serviceOmzet: 0,
          serviceLaba: 0,
          transactionCount: 0,
        };
      }

      const { data: ledgerRows, error: ledgerError } = await supabase
        .from('financial_ledger')
        .select('reference_id, amount')
        .eq('category', 'profit')
        .eq('reference_type', 'transaction')
        .in('reference_id', txIds);

      if (ledgerError) throw ledgerError;

      const profitByTxId = new Map<string, number>();
      for (const row of ledgerRows) {
        profitByTxId.set(row.reference_id, (profitByTxId.get(row.reference_id) ?? 0) + row.amount);
      }

      const combined: TransactionWithLedger[] = transactions.map((t) => ({
        source: t.source,
        total_amount: t.total_amount,
        ledger_profit: profitByTxId.get(t.id) ?? 0,
      }));

      const summary = combined.reduce(
        (acc, t) => {
          acc.totalOmzet += t.total_amount;
          acc.totalLaba += t.ledger_profit;
          if (t.source === 'pos') {
            acc.posOmzet += t.total_amount;
            acc.posLaba += t.ledger_profit;
          } else {
            acc.serviceOmzet += t.total_amount;
            acc.serviceLaba += t.ledger_profit;
          }
          return acc;
        },
        {
          totalOmzet: 0,
          totalLaba: 0,
          posOmzet: 0,
          posLaba: 0,
          serviceOmzet: 0,
          serviceLaba: 0,
        }
      );

      return { ...summary, transactionCount: combined.length };
    },
  });
}

export function useDailyBreakdown(range: DateRange) {
  return useQuery({
    queryKey: ['daily-breakdown', range.from, range.to],
    queryFn: async (): Promise<DailyBreakdownRow[]> => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('ledger_daily_summary')
        .select('report_date, category, total_amount')
        .in('category', ['cash', 'profit'])
        .gte('report_date', range.from)
        .lte('report_date', range.to)
        .order('report_date', { ascending: false });

      if (error) throw error;

      const byDate = new Map<string, DailyBreakdownRow>();
      for (const row of data) {
        const existing = byDate.get(row.report_date) ?? {
          date: row.report_date,
          omzet: 0,
          laba: 0,
        };
        if (row.category === 'cash') existing.omzet = row.total_amount;
        if (row.category === 'profit') existing.laba = row.total_amount;
        byDate.set(row.report_date, existing);
      }

      return Array.from(byDate.values());
    },
  });
}
