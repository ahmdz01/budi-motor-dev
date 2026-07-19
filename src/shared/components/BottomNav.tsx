'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingCart, Wrench, Truck, Menu } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { RESTRICTED_ROUTES, type RoleCode } from '@/shared/constants/roleAccess';

const ALL_NAV_ITEMS = [
  { href: '/dashboard', label: 'Beranda', icon: LayoutDashboard },
  { href: '/pos', label: 'Kasir', icon: ShoppingCart },
  { href: '/service', label: 'Servis', icon: Wrench },
  { href: '/inventory', label: 'Barang', icon: Truck },
  { href: '/more', label: 'Lainnya', icon: Menu },
] as const;

interface BottomNavProps {
  roleCode: RoleCode;
}

export function BottomNav({ roleCode }: BottomNavProps) {
  const pathname = usePathname();

  // Tampilkan tombol hanya jika path tsb tidak dibatasi (netral untuk
  // semua role) ATAU role pengguna termasuk yang diizinkan.
  // Aturan sama persis dengan yang dipakai Middleware (RESTRICTED_ROUTES) —
  // sengaja diimpor dari sumber yang sama supaya tidak ada 2 aturan
  // yang bisa saling tidak sinkron.
  const visibleItems = ALL_NAV_ITEMS.filter((item) => {
    const allowedRoles = RESTRICTED_ROUTES[item.href];
    return !allowedRoles || allowedRoles.includes(roleCode);
  });

  return (
    <nav className="fixed right-0 bottom-0 left-0 z-50 border-t border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-md items-center justify-around">
        {visibleItems.map(({ href, label, icon: Icon }) => {
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
