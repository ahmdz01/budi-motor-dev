import { Input } from '@/shared/components/Input';
import { Badge } from '@/shared/components/Badge';
import type { OpnameCartItem } from '../types';

interface OpnameItemRowProps {
  item: OpnameCartItem;
  onChange: (item: OpnameCartItem) => void;
  onRemove: () => void;
}

export function OpnameItemRow({ item, onChange, onRemove }: OpnameItemRowProps) {
  const selisih = item.stokFisik - item.stokSistem;

  return (
    <div className="flex flex-col gap-2 rounded-md border border-neutral-200 p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-900">{item.productName}</p>
          <p className="text-xs text-neutral-500">Stok sistem: {item.stokSistem}</p>
        </div>
        <button type="button" onClick={onRemove} className="text-danger-600 text-xs">
          Hapus
        </button>
      </div>

      <Input
        label="Stok Fisik (hasil hitung)"
        type="number"
        min={0}
        value={item.stokFisik}
        onChange={(e) => onChange({ ...item, stokFisik: Number(e.target.value) })}
      />

      {selisih !== 0 && (
        <Badge variant={selisih > 0 ? 'success' : 'danger'}>
          Selisih: {selisih > 0 ? '+' : ''}
          {selisih}
        </Badge>
      )}

      {selisih > 0 && (
        <Input
          label="Harga Beli (untuk stok tambahan ini)"
          type="number"
          min={0}
          value={item.hargaBeliBaru ?? ''}
          onChange={(e) =>
            onChange({ ...item, hargaBeliBaru: e.target.value ? Number(e.target.value) : null })
          }
        />
      )}

      {selisih < 0 && (
        <p className="text-xs text-neutral-500">
          Stok akan dikurangi otomatis dari batch tertua (FIFO).
        </p>
      )}

      <Input
        label="Catatan (opsional)"
        value={item.reason}
        onChange={(e) => onChange({ ...item, reason: e.target.value })}
      />
    </div>
  );
}
