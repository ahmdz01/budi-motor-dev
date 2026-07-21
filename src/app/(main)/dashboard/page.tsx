'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MetricCard } from '@/features/dashboard/components/MetricCard';
import { QuickActions } from '@/features/dashboard/components/QuickActions';
import { RecentActivity } from '@/features/dashboard/components/RecentActivity';
import { useDashboardMetrics } from '@/features/dashboard/hooks/useDashboardData';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { Button } from '@/shared/components/Button';
import { useCurrentUser } from '@/shared/contexts/UserContext';

export default function DashboardPage() {
  const { data: metrics, isLoading, error } = useDashboardMetrics();
  const router = useRouter();
  const currentUser = useCurrentUser();
  const isOwner = currentUser.roleCode === 'owner' || currentUser.roleCode === 'super_admin';

  return (
    <div className="flex flex-col gap-5 p-4">
      <QuickActions />

      {isLoading && (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-danger-600 text-sm">
          Gagal memuat data dashboard. Coba muat ulang halaman.
        </p>
      )}

      {metrics && (
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="Kas & Dana Restock"
            value={formatCurrency(metrics.kas_hari_ini)}
            subValue={`Restock: ${formatCurrency(metrics.dana_restock_total)}`}
            tone="success"
          />
          <MetricCard
            label="Barang Hampir Habis"
            value={`${metrics.barang_menipis_count} item`}
            tone={metrics.barang_menipis_count > 0 ? 'warning' : 'neutral'}
            onClick={() => router.push('/inventory')}
          />
          <MetricCard
            label="Servis Berjalan"
            value={`${metrics.servis_berjalan_count} servis`}
            tone="accent"
            onClick={() => router.push('/service')}
          />
          <MetricCard
            label="Hutang Jatuh Tempo"
            value={formatCurrency(metrics.hutang_jatuh_tempo_total)}
            tone={metrics.hutang_jatuh_tempo_total > 0 ? 'danger' : 'neutral'}
            onClick={() => router.push('/suppliers')}
          />
          {isOwner && (
            <MetricCard
              label="Laba Hari Ini"
              value={formatCurrency(metrics.laba_hari_ini)}
              tone="accent"
            />
          )}
        </div>
      )}

      <RecentActivity />

      <Link href="/more" className="text-accent-600 text-center text-sm">
        <Button variant="ghost" size="md">
          Lihat laporan lengkap
        </Button>
      </Link>
    </div>
  );
}
