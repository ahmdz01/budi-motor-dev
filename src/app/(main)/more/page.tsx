import Link from 'next/link';
import { Building2, Users, PackagePlus, History, Wallet } from 'lucide-react';
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

      <p className="text-sm text-neutral-500">
        Menu Laporan dan Pengaturan akan tersedia di sini setelah masing-masing modul selesai
        dibangun.
      </p>
    </div>
  );
}
