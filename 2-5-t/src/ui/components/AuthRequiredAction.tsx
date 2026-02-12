"use client";

import { PropsWithChildren } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useSession } from "@/src/ui/auth/useSession";

type Props = PropsWithChildren<{
  returnTo?: string;
  label?: string;
  className?: string;
}>;

export function AuthRequiredAction({ children, returnTo, label = "需要登入", className }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { data } = useSession();

  if (data?.authenticated) return <>{children}</>;

  const rt = returnTo ?? pathname ?? "/";
  return (
    <button
      type="button"
      className={
        className ??
        "rounded border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600"
      }
      onClick={() => router.push(`/login?returnTo=${encodeURIComponent(rt)}`)}
      aria-disabled
      title={label}
    >
      {label}
    </button>
  );
}
