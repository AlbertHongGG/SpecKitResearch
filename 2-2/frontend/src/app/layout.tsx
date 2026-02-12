import type { ReactNode } from 'react';
import './globals.css';
import { Providers } from './providers';
import { Header } from '../components/header';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>
        <Providers>
          <Header />
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
