import { BottomNav } from '@/shared/components/BottomNav';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* pb-20 memberi ruang di bawah supaya konten tidak
          tertutup Bottom Navigation yang posisinya fixed */}
      <main className="pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
