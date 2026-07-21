'use client';

import { useCartStore, type CustomerTypeUsed } from '../stores/useCartStore';

const options: { value: CustomerTypeUsed; label: string }[] = [
  { value: 'general', label: 'Umum' },
  { value: 'service', label: 'Servis' },
  { value: 'workshop', label: 'Bengkel' },
];

export function CustomerTypeSelector() {
  const customerTypeUsed = useCartStore((s) => s.customerTypeUsed);
  const setCustomerTypeUsed = useCartStore((s) => s.setCustomerTypeUsed);
  const itemsCount = useCartStore((s) => s.items.length);

  function handleChange(value: CustomerTypeUsed) {
    if (value === customerTypeUsed) return;

    if (itemsCount > 0) {
      const confirmed = window.confirm(
        'Ganti tipe harga akan mengosongkan keranjang saat ini. Lanjutkan?'
      );
      if (!confirmed) return;
    }

    setCustomerTypeUsed(value);
  }

  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => handleChange(opt.value)}
          className={`flex-1 rounded-md border py-2 text-sm font-medium ${
            customerTypeUsed === opt.value
              ? 'border-accent-600 bg-accent-50 text-accent-700'
              : 'border-neutral-300 text-neutral-600'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
