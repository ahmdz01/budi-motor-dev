import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import type { ServiceItem } from '../types';

interface ServiceItemsListProps {
  items: ServiceItem[];
  canReturn?: boolean;
  onReturn?: (item: ServiceItem) => void;
}

export function ServiceItemsList({ items, canReturn = false, onReturn }: ServiceItemsListProps) {
  const total = items.reduce((sum, i) => sum + i.subtotal, 0);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-neutral-700">Item Servis</p>

      {items.length === 0 && (
        <p className="text-sm text-neutral-400">Belum ada barang/jasa ditambahkan.</p>
      )}

      {items.map((item) => (
        <Card key={item.id} className="flex items-center justify-between p-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-neutral-900">{item.name_snapshot}</p>
              <Badge variant={item.item_type === 'product' ? 'accent' : 'neutral'}>
                {item.item_type === 'product' ? 'Barang' : 'Jasa'}
              </Badge>
            </div>
            <p className="text-xs text-neutral-500">
              {item.qty} x {formatCurrency(item.price_snapshot)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">{formatCurrency(item.subtotal)}</span>
            {canReturn && onReturn && (
              <Button variant="secondary" size="md" onClick={() => onReturn(item)}>
                Retur
              </Button>
            )}
          </div>
        </Card>
      ))}

      {items.length > 0 && (
        <div className="flex items-center justify-between rounded-md border border-neutral-200 p-3">
          <span className="text-sm font-medium text-neutral-700">Total Sementara</span>
          <span className="text-lg font-semibold">{formatCurrency(total)}</span>
        </div>
      )}
    </div>
  );
}
