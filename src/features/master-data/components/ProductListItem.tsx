import Link from 'next/link';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import type { ProductListItem as ProductListItemType } from '../types';

export function ProductListItem({ product }: { product: ProductListItemType }) {
  const tone =
    product.total_stock === 0
      ? 'danger'
      : product.total_stock <= product.min_stock
        ? 'warning'
        : 'success';

  return (
    <Link href={`/inventory/${product.id}`}>
      <Card className="flex items-center justify-between p-3 active:bg-neutral-50">
        <div>
          <p className="text-sm font-medium text-neutral-900">{product.name}</p>
          <p className="text-xs text-neutral-500">
            {product.location_label ?? 'Tanpa lokasi'}
            {product.category_name && ` · ${product.category_name}`}
          </p>
        </div>
        <Badge variant={tone}>{product.total_stock} pcs</Badge>
      </Card>
    </Link>
  );
}
