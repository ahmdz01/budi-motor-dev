import { Input } from '@/shared/components/Input';
import { Badge } from '@/shared/components/Badge';
import type { OpnameCartItem } from '../types';

interface OpnameItemRowProps {
  item: OpnameCartItem;
  onChange: (item: OpnameCartItem) => void;
  onRemove: () => void;
}

export function OpnameItemRow({
  item,
  onChange,
  onRemove,
}: OpnameItemRowProps) {
  const selisih = item.stokFisik - item.stokSistem;

  return (
    <div className="flex flex-col gap-3 rounded-md border border-neutral-200 bg-white p-4">
      {/* Header Barang */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-900">
            {item.productName}
          </p>

          <p className="mt-1 text-xs text-neutral-500">
            Stok sistem:{' '}
            <span className="font-medium text-neutral-700">
              {item.stokSistem}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 text-xs text-danger-600 hover:underline"
        >
          Hapus
        </button>
      </div>

      {/* Stok Fisik */}
      <Input
        label="Stok Fisik (hasil hitung)"
        type="number"
        min={0}
        value={item.stokFisik}
        onChange={(e) => {
          const value = Math.max(0, Number(e.target.value));

          onChange({
            ...item,
            stokFisik: value,
          });
        }}
      />

      {/* Selisih */}
      {selisih === 0 && (
        <Badge variant="success">
          Stok sesuai — tidak ada selisih
        </Badge>
      )}

      {selisih > 0 && (
        <Badge variant="success">
          Stok lebih: +{selisih}
        </Badge>
      )}

      {selisih < 0 && (
        <Badge variant="danger">
          Stok kurang: {selisih}
        </Badge>
      )}

      {/* Stok Bertambah */}
      {selisih > 0 && (
        <div className="flex flex-col gap-2">
          <Input
            label="Harga Beli (untuk stok tambahan)"
            type="number"
            min={0}
            value={item.hargaBeliBaru ?? ''}
            onChange={(e) =>
              onChange({
                ...item,
                hargaBeliBaru: e.target.value
                  ? Number(e.target.value)
                  : null,
              })
            }
          />

          <p className="text-xs text-neutral-500">
            Harga ini digunakan sebagai harga beli untuk stok tambahan
            hasil opname.
          </p>
        </div>
      )}

      {/* Stok Berkurang */}
      {selisih < 0 && (
        <div className="rounded-md bg-neutral-50 p-2.5">
          <p className="text-xs text-neutral-500">
            Stok akan dikurangi otomatis dari batch tertua (FIFO).
          </p>
        </div>
      )}

      {/* Catatan */}
      <Input
        label="Catatan (opsional)"
        value={item.reason}
        onChange={(e) =>
          onChange({
            ...item,
            reason: e.target.value,
          })
        }
        placeholder="Contoh: barang rusak, salah hitung, ditemukan di rak..."
      />
    </div>
  );
}