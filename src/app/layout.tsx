import type { Metadata } from 'next';
import { QueryProvider } from '@/shared/components/providers/QueryProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Budi Motor',
  description: 'Aplikasi manajemen bengkel Budi Motor',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
