import type { ReactNode } from 'react';
import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'Expense Tracker',
  description: 'Personal expense tracking with monthly reports',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
