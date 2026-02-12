import type { Metadata } from "next";
import "./globals.css";

import { Providers } from "@/app/providers";
import { Footer } from "@/src/ui/components/Footer";
import { NavBar } from "@/src/ui/components/NavBar";
import { ToastProvider } from "@/src/ui/components/Toast";

export const metadata: Metadata = {
  title: "多角色論壇",
  description: "Multi-Role Forum & Community Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-dvh bg-gray-50 text-gray-950">
        <Providers>
          <ToastProvider>
            <NavBar />
            {children}
            <Footer />
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
