import './globals.css';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import { Header } from '../components/Header';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <Providers>
          <Header />
          <main className="mx-auto max-w-5xl p-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
