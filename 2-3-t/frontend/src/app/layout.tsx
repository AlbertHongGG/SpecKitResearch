import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

import { getSession } from '../lib/session';
import { Nav } from '../components/nav/Nav';
import { QueryProvider } from '../lib/query-client';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'API Key Platform',
  description: 'API platform + API key management + gateway',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Server-side session fetch (no flash)
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  const sessionPromise = getSession();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Nav sessionPromise={sessionPromise} />
        <QueryProvider>
          <main className="mx-auto max-w-5xl p-6">{children}</main>
        </QueryProvider>
      </body>
    </html>
  );
}
