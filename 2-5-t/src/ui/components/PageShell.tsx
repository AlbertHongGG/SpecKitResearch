import type { ReactNode } from "react";

type Props = {
  title?: string;
  children: ReactNode;
};

export function PageShell({ title, children }: Props) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {title ? <h1 className="text-xl font-semibold">{title}</h1> : null}
      {children}
    </main>
  );
}
