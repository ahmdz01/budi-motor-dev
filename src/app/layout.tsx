import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Budi Motor',
  description: 'Aplikasi manajemen bengkel Budi Motor',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
