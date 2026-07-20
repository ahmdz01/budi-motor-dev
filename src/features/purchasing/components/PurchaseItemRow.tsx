import { Trash2 } from 'lucide-react';
import { Input } from '@/shared/components/Input';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import type { PurchaseCartItem } from '../types';

interface PurchaseItemRowProps {
  item: PurchaseCartItem;
  onChange: (item: PurchaseCartItem) => void;
  onRemove: () => void;
}

export function PurchaseItemRow({ item, onChange, onRemove }: PurchaseItemRowProps) {
  const subtotal = item.qty * item.unitPrice;

  return (
    <div className="flex flex-col gap-2 rounded-md border border-neutral-200 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-900">{item.productName}</p>
        <button type="button" onClick={onRemove} className="text-danger-600">
          <Trash2 size={16} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input
          label="Qty"
          type="number"
          min={1}
          value={item.qty}
          onChange={(e) => onChange({ ...item, qty: Number(e.target.value) })}
        />
        <Input
          label="Harga Beli / pcs"
          type="number"
          min={0}
          value={item.unitPrice}
          onChange={(e) => onChange({ ...item, unitPrice: Number(e.target.value) })}
        />
      </div>
      <p className="text-right text-sm text-neutral-500">Subtotal: {formatCurrency(subtotal)}</p>
    </div>
  );
}