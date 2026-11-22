import type { Metadata } from 'next';
import React from 'react';
import { AdminShell } from '@/components/AdminShell';
import { AdminProvider } from '@/context/AdminContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'EZ-Space Admin — Hệ thống Quản trị Nền tảng',
  description:
    'Hệ thống Quản trị Nền tảng EZ-Space Smart Parking (Node.js + Next.js + Tailwind CSS + PostgreSQL)'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AdminProvider>
          <AdminShell>{children}</AdminShell>
        </AdminProvider>
      </body>
    </html>
  );
}
