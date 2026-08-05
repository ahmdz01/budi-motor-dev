import type { Metadata, Viewport } from 'next';
import { QueryProvider } from '@/shared/components/providers/QueryProvider';
import './globals.css';
import { ServiceWorkerRegistration } from '@/shared/components/ServiceWorkerRegistration';

export const metadata: Metadata = {
  title: 'Budi Motor',
  description: 'Aplikasi manajemen bengkel Budi Motor',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon-32.png',
    apple: '/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Budi Motor',
  },
};

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ServiceWorkerRegistration />
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}