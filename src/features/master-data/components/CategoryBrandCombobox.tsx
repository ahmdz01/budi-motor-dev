'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';

interface Option {
  id: string;
  name: string;
}

interface CategoryBrandComboboxProps {
  label: string;
  options: Option[];
  value: string | null;
  onChange: (id: string) => void;
  onCreateNew: (name: string) => Promise<Option>;
  isCreating: boolean;
}

/**
 * Pola "pilih atau tambah baru" — sesuai BR-INV-04/BR-SUP-01:
 * Admin bisa pilih dari daftar existing, atau ketik nama baru dan
 * langsung tersimpan tanpa pindah halaman. Dipakai untuk Category,
 * Brand, dan nanti Supplier (form Barang Masuk, Phase 5).
 */
export function CategoryBrandCombobox({
  label,
  options,
  value,
  onChange,
  onCreateNew,
  isCreating,
}: CategoryBrandComboboxProps) {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');

  async function handleCreate() {
    if (!newName.trim()) return;
    const created = await onCreateNew(newName.trim());
    onChange(created.id);
    setNewName('');
    setIsAddingNew(false);
  }

  if (isAddingNew) {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-700">{label} Baru</label>
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={`Nama ${label.toLowerCase()} baru`}
            autoFocus
          />
          <Button type="button" size="md" onClick={handleCreate} isLoading={isCreating}>
            Simpan
          </Button>
          <Button type="button" variant="secondary" size="md" onClick={() => setIsAddingNew(false)}>
            Batal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-neutral-700">{label}</label>
      <div className="flex gap-2">
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="focus:border-accent-500 focus:ring-accent-100 flex-1 rounded-md border border-neutral-300 px-4 py-2.5 text-base focus:ring-2 focus:outline-none"
        >
          <option value="" disabled>
            Pilih {label.toLowerCase()}
          </option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
          ))}
        </select>
        <Button type="button" variant="secondary" size="md" onClick={() => setIsAddingNew(true)}>
          <Plus size={18} />
        </Button>
      </div>
    </div>
  );
}
