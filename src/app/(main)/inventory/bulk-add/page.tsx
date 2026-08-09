import { BulkAddForm } from '@/features/master-data/components/BulkAddForm';

export default function BulkAddPage() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Tambah Banyak Barang</h1>
      <p className="text-sm text-neutral-500">
        Cocok untuk memasukkan banyak barang sekaligus (misalnya semua oli). Harga yang diisi
        akan dipakai untuk Harga Umum, Servis, dan Bengkel sekaligus — bisa diubah satu-satu
        nanti lewat Edit Barang kalau perlu beda harga.
      </p>
      <BulkAddForm />
    </div>
  );
}