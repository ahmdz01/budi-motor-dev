'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingCart, Wrench, Truck, Menu } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

/**
 * Bottom navigation — hasil konsolidasi 10 halaman awal menjadi
 * 5 menu utama (lihat dokumen Wireframe & UX sebelumnya):
 * Detail Barang, Hutang Supplier, Stock Opname, Laporan, Pengaturan
 * semuanya diakses lewat "Lainnya", bukan jadi tombol nav sendiri.
 */
const navItems = [
  { href: '/dashboard', label: 'Beranda', icon: LayoutDashboard },
  { href: '/pos', label: 'Kasir', icon: ShoppingCart },
  { href: '/service', label: 'Servis', icon: Wrench },
  { href: '/inventory', label: 'Barang', icon: Truck },
  { href: '/more', label: 'Lainnya', icon: Menu },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed right-0 bottom-0 left-0 z-50 border-t border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-md items-center justify-around">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors',
                isActive ? 'text-accent-600' : 'text-neutral-500'
              )}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
