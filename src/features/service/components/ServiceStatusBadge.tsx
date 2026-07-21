import { Badge } from '@/shared/components/Badge';
import type { ServiceStatus } from '../types';

const statusConfig: Record<ServiceStatus, { label: string; variant: Parameters<typeof Badge>[0]['variant'] }> = {
  waiting: { label: 'Menunggu', variant: 'neutral' },
  pending_approval: { label: 'Menunggu Persetujuan', variant: 'warning' },
  in_progress: { label: 'Dikerjakan', variant: 'accent' },
  completed: { label: 'Selesai', variant: 'success' },
  paid: { label: 'Lunas', variant: 'success' },
  cancelled: { label: 'Dibatalkan', variant: 'danger' },
};

export function ServiceStatusBadge({ status }: { status: ServiceStatus }) {
  const config = statusConfig[status];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}