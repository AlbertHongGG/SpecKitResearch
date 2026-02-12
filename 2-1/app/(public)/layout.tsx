import NavBar from '@/components/NavBar';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
