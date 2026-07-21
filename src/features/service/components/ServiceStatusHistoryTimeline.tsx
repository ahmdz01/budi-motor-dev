import { Card } from '@/shared/components/Card';
import { ServiceStatusBadge } from './ServiceStatusBadge';
import type { ServiceStatusHistoryEntry } from '../types';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ServiceStatusHistoryTimeline({
  history,
}: {
  history: ServiceStatusHistoryEntry[];
}) {
  if (history.length === 0) return null;

  return (
    <Card className="flex flex-col gap-3 p-4">
      <p className="text-sm font-medium text-neutral-700">Riwayat Status</p>
      <div className="flex flex-col gap-3">
        {history.map((entry, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-neutral-300" />
            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-sm">
                <ServiceStatusBadge status={entry.status_to} />
                <span className="text-xs text-neutral-400">oleh {entry.changed_by_name}</span>
              </div>
              {entry.reason && <p className="mt-0.5 text-xs text-neutral-500">{entry.reason}</p>}
              <p className="mt-0.5 text-xs text-neutral-400">{formatDateTime(entry.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
