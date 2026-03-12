import './globals.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AppNavigation } from '@/components/navigation/app-navigation';
import { SessionProvider } from '@/lib/auth/session-context';
import { QueryProvider } from '@/lib/query/query-provider';

export const metadata: Metadata = {
  title: 'Jira Lite',
  description: 'Enterprise project tracking foundation',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <SessionProvider>
            <div className="app-shell">
              <header className="app-header">
                <div>
                  <p className="eyebrow">Project foundation</p>
                  <h1>Jira Lite</h1>
                </div>
                <AppNavigation />
              </header>
              <main className="app-main">{children}</main>
            </div>
          </SessionProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
