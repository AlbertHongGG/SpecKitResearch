"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin/boards", label: "Boards" },
  { href: "/admin/moderators", label: "Moderators" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/audit", label: "Audit" },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 text-sm">
      {items.map((it) => {
        const active = pathname?.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={
              "rounded-md border px-3 py-2 " +
              (active ? "border-black bg-black text-white" : "border-gray-200 bg-white hover:bg-neutral-50")
            }
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
