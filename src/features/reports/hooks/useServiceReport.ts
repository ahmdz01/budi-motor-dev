'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';
import type { DateRange, ServiceReportSummary, MechanicPerformanceRow } from '../types';

export function useServiceReport(range: DateRange) {
  return useQuery({
    queryKey: ['service-report', range.from, range.to],
    queryFn: async (): Promise<ServiceReportSummary> => {
      const supabase = createClient();

      const { data: services, error: svcError } = await supabase
        .from('services')
        .select('id, status, is_warranty_claim')
        .gte('created_at', `${range.from}T00:00:00`)
        .lte('created_at', `${range.to}T23:59:59`);

      if (svcError) throw svcError;

      const countByStatus: Record<string, number> = {};
      let warrantyClaimCount = 0;
      for (const s of services) {
        countByStatus[s.status] = (countByStatus[s.status] ?? 0) + 1;
        if (s.is_warranty_claim) warrantyClaimCount += 1;
      }

      const serviceIds = services.map((s) => s.id);

      // Omzet servis: dari transactions.source = 'service' — pola
      // sama seperti Laporan Penjualan (Langkah 10.2), reuse sumber
      // kebenaran yang sama, bukan query baru yang beda logika.
      let totalOmzet = 0;
      if (serviceIds.length > 0) {
        const { data: txRows, error: txError } = await supabase
          .from('transactions')
          .select('total_amount')
          .eq('source', 'service')
          .eq('status', 'paid')
          .in('service_id', serviceIds);

        if (txError) throw txError;
        totalOmzet = txRows.reduce((sum, t) => sum + t.total_amount, 0);
      }

      // Waktu penyelesaian rata-rata: selisih in_progress -> paid/completed
      // per servis, dari service_status_history.
      let avgCompletionHours: number | null = null;
      if (serviceIds.length > 0) {
        const { data: historyRows, error: historyError } = await supabase
          .from('service_status_history')
          .select('service_id, status_to, created_at')
          .in('service_id', serviceIds)
          .in('status_to', ['in_progress', 'completed', 'paid'])
          .order('created_at', { ascending: true });

        if (historyError) throw historyError;

        const startByService = new Map<string, string>();
        const durations: number[] = [];

        for (const row of historyRows) {
          if (row.status_to === 'in_progress' && !startByService.has(row.service_id)) {
            startByService.set(row.service_id, row.created_at);
          } else if (
            (row.status_to === 'completed' || row.status_to === 'paid') &&
            startByService.has(row.service_id)
          ) {
            const start = new Date(startByService.get(row.service_id)!).getTime();
            const end = new Date(row.created_at).getTime();
            durations.push((end - start) / 3600000); // ms -> jam
            startByService.delete(row.service_id); // hitung sekali per servis
          }
        }

        if (durations.length > 0) {
          avgCompletionHours = durations.reduce((a, b) => a + b, 0) / durations.length;
        }
      }

      return {
        totalServices: services.length,
        countByStatus,
        totalOmzet,
        avgCompletionHours,
        warrantyClaimCount,
      };
    },
  });
}

export function useMechanicPerformance(range: DateRange) {
  return useQuery({
    queryKey: ['mechanic-performance', range.from, range.to],
    queryFn: async (): Promise<MechanicPerformanceRow[]> => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('services')
        .select('mechanic_id, users!services_mechanic_id_fkey(name)')
        .not('mechanic_id', 'is', null)
        .gte('created_at', `${range.from}T00:00:00`)
        .lte('created_at', `${range.to}T23:59:59`);

      if (error) throw error;

      const countMap = new Map<string, MechanicPerformanceRow>();
      for (const row of data) {
        const mechanicId = row.mechanic_id as string;
        const mechanicName =
          (row.users as unknown as { name: string } | null)?.name ?? 'Tidak diketahui';
        const existing = countMap.get(mechanicId);
        if (existing) {
          existing.serviceCount += 1;
        } else {
          countMap.set(mechanicId, { mechanicId, mechanicName, serviceCount: 1 });
        }
      }

      return Array.from(countMap.values()).sort((a, b) => b.serviceCount - a.serviceCount);
    },
  });
}
