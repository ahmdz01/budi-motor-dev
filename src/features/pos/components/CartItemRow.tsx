import { Minus, Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { useCartStore, type CartItem } from '../stores/useCartStore';

export function CartItemRow({ item }: { item: CartItem }) {
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);

  return (
    <div className="flex items-center justify-between gap-2 border-b border-neutral-100 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-900">{item.productName}</p>
        <p className="text-xs text-neutral-500">{formatCurrency(item.priceSnapshot)} / pcs</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => updateQty(item.productId, item.qty - 1)}
          className="rounded-md border border-neutral-300 p-1.5"
        >
          <Minus size={14} />
        </button>
        <span className="w-6 text-center text-sm">{item.qty}</span>
        <button
          type="button"
          onClick={() => updateQty(item.productId, Math.min(item.qty + 1, item.stockAvailable))}
          disabled={item.qty >= item.stockAvailable}
          className="rounded-md border border-neutral-300 p-1.5 disabled:opacity-40"
        >
          <Plus size={14} />
        </button>
        <button
          type="button"
          onClick={() => removeItem(item.productId)}
          className="text-danger-600 p-1.5"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
