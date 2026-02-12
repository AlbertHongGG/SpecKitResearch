import "./globals.css";
import Providers from "@/app/providers";
import { NavBar } from "@/components/NavBar";

export const metadata = {
  title: "Multi-Role Forum",
  description: "Multi-board forum with RBAC + moderation",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>
        <Providers>
          <NavBar />
          <main className="mx-auto max-w-5xl p-4">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
