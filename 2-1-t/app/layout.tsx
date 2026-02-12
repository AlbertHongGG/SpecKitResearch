import type { Metadata } from 'next';
import './globals.css';

import Providers from './providers';
import { NavBar } from '../src/ui/components/NavBar';

export const metadata: Metadata = {
  title: 'Content Course Platform',
  description: '線上課程平台（非影音串流）',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen bg-white text-slate-900">
        <Providers>
          <NavBar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
