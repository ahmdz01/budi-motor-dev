import Link from 'next/link';
import {
  Building2,
  Users,
  PackagePlus,
  History,
  Wallet,
  BarChart3,
  Wrench,
  Boxes,
  Settings,
  Tag,
} from 'lucide-react';
import { Card } from '@/shared/components/Card';
import { ClipboardCheck } from 'lucide-react';

export default function MorePage() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Lainnya</h1>

      <Link href="/customers">
        <Card className="flex items-center gap-3 p-3 active:bg-neutral-50">
          <Users size={20} className="text-accent-600" />
          <div>
            <p className="text-sm font-medium text-neutral-900">Pelanggan</p>
            <p className="text-xs text-neutral-500">Daftar pelanggan dan kendaraan</p>
          </div>
        </Card>
      </Link>

      <Link href="/purchases">
        <Card className="flex items-center gap-3 p-3 active:bg-neutral-50">
          <PackagePlus size={20} className="text-accent-600" />
          <div>
            <p className="text-sm font-medium text-neutral-900">Barang Masuk</p>
            <p className="text-xs text-neutral-500">Catat pembelian dari supplier</p>
          </div>
        </Card>
      </Link>

      <Link href="/suppliers">
        <Card className="flex items-center gap-3 p-3 active:bg-neutral-50">
          <Building2 size={20} className="text-accent-600" />
          <div>
            <p className="text-sm font-medium text-neutral-900">Supplier</p>
            <p className="text-xs text-neutral-500">Daftar dan detail supplier</p>
          </div>
        </Card>
      </Link>

      <Link href="/stock-opname">
        <Card className="flex items-center gap-3 p-3 active:bg-neutral-50">
          <ClipboardCheck size={20} className="text-accent-600" />
          <div>
            <p className="text-sm font-medium text-neutral-900">Stock Opname</p>
            <p className="text-xs text-neutral-500">Cocokkan stok fisik dengan sistem</p>
          </div>
        </Card>
      </Link>

      <Link href="/transactions">
        <Card className="flex items-center gap-3 p-3 active:bg-neutral-50">
          <History size={20} className="text-accent-600" />
          <div>
            <p className="text-sm font-medium text-neutral-900">Riwayat Transaksi</p>
            <p className="text-xs text-neutral-500">Transaksi POS & Servis</p>
          </div>
        </Card>
      </Link>

      <Link href="/financial">
        <Card className="flex items-center gap-3 p-3 active:bg-neutral-50">
          <Wallet size={20} className="text-accent-600" />
          <div>
            <p className="text-sm font-medium text-neutral-900">Catatan Keuangan</p>
            <p className="text-xs text-neutral-500">Setor/tarik Dana Restock, biaya operasional</p>
          </div>
        </Card>
      </Link>

      <Link href="/reports/sales">
        <Card className="flex items-center gap-3 p-3 active:bg-neutral-50">
          <BarChart3 size={20} className="text-accent-600" />
          <div>
            <p className="text-sm font-medium text-neutral-900">Laporan Penjualan</p>
            <p className="text-xs text-neutral-500">Omzet, laba, dan rincian harian</p>
          </div>
        </Card>
      </Link>
      <Link href="/reports/service">
        <Card className="flex items-center gap-3 p-3 active:bg-neutral-50">
          <Wrench size={20} className="text-accent-600" />
          <div>
            <p className="text-sm font-medium text-neutral-900">Laporan Servis</p>
            <p className="text-xs text-neutral-500">Status servis dan performa mekanik</p>
          </div>
        </Card>
      </Link>

      <Link href="/reports/inventory">
        <Card className="flex items-center gap-3 p-3 active:bg-neutral-50">
          <Boxes size={20} className="text-accent-600" />
          <div>
            <p className="text-sm font-medium text-neutral-900">Laporan Inventory</p>
            <p className="text-xs text-neutral-500">Nilai stok, barang menipis, pergerakan</p>
          </div>
        </Card>
      </Link>

      <Link href="/reports/price-list">
        <Card className="flex items-center gap-3 p-3 active:bg-neutral-50">
          <Tag size={20} className="text-accent-600" />
          <div>
            <p className="text-sm font-medium text-neutral-900">Daftar Harga</p>
            <p className="text-xs text-neutral-500">Lihat & cetak harga semua barang</p>
          </div>
        </Card>
      </Link>

      <Link href="/settings">
        <Card className="flex items-center gap-3 p-3 active:bg-neutral-50">
          <Settings size={20} className="text-accent-600" />
          <div>
            <p className="text-sm font-medium text-neutral-900">Pengaturan</p>
            <p className="text-xs text-neutral-500">Profil toko, pengguna, dan lainnya</p>
          </div>
        </Card>
      </Link>

      <p className="text-sm text-neutral-500">Fitur pengguna & pengaturan harga menyusul.</p>
    </div>
  );
}
