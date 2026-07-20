import Link from 'next/link';
import { PackagePlus, Wrench, HandCoins, ClipboardCheck } from 'lucide-react';

const actions = [
  { href: '/inventory', label: 'Barang Masuk', icon: PackagePlus },
  { href: '/service', label: 'Servis Baru', icon: Wrench },
  { href: '/inventory', label: 'Bayar Supplier', icon: HandCoins },
  { href: '/inventory', label: 'Stock Opname', icon: ClipboardCheck },
] as const;

export function QuickActions() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {actions.map(({ href, label, icon: Icon }, i) => (
        <Link
          key={`${href}-${i}`}
          href={href}
          className="flex flex-col items-center gap-1.5 rounded-md border border-neutral-200 bg-white p-3 text-center active:bg-neutral-50"
        >
          <Icon size={20} className="text-accent-600" />
          <span className="text-xs font-medium text-neutral-700">{label}</span>
        </Link>
      ))}
    </div>
  );
}
