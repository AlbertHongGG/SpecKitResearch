import './globals.css';
import { ReactNode } from 'react';
import { QueryProvider } from '@/lib/query/query-provider';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
