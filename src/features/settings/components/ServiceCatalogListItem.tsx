import Link from 'next/link';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import type { ServiceCatalogItem } from '../types';

export function ServiceCatalogListItem({ item }: { item: ServiceCatalogItem }) {
  return (
    <Link href={`/settings/service-catalog/${item.id}/edit`}>
      <Card className="flex items-center justify-between p-3 active:bg-neutral-50">
        <div>
          <p className="text-sm font-medium text-neutral-900">{item.name}</p>
          <p className="text-xs text-neutral-500">
            {formatCurrency(item.default_price)}
            {item.warranty_days ? ` · Garansi ${item.warranty_days} hari` : ''} · Dipakai{' '}
            {item.usage_count}x
          </p>
        </div>
        {item.status === 'inactive' && <Badge variant="neutral">Nonaktif</Badge>}
      </Card>
    </Link>
  );
}
