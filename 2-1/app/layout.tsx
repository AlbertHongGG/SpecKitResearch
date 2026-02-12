import './globals.css';

import type { Metadata } from 'next';
import Providers from './providers';

export const metadata: Metadata = {
  title: '線上課程平台（非影音串流）',
  description: '內容型線上課程平台（文字/圖片/PDF），含購買與權限控管。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
