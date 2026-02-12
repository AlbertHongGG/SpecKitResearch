"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { ApiClientError } from "@/lib/http/client";
import { useLoginMutation } from "@/lib/queries/auth";

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const returnTo = sp.get("returnTo") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<ApiClientError | null>(null);

  const login = useLoginMutation();

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-semibold">登入</h1>

      {err ? <ErrorBanner error={err} /> : null}

      <form
        className="space-y-3 rounded-lg border bg-white p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          try {
            await login.mutateAsync({ email, password, returnTo });
            router.push(returnTo);
          } catch (e) {
            setErr(e as ApiClientError);
          }
        }}
      >
        <label className="block space-y-1">
          <div className="text-sm text-slate-600">Email</div>
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            required
          />
        </label>

        <label className="block space-y-1">
          <div className="text-sm text-slate-600">密碼</div>
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            required
          />
        </label>

        <button
          className="w-full rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
          type="submit"
          disabled={login.isPending}
        >
          {login.isPending ? "登入中…" : "登入"}
        </button>
      </form>
    </div>
  );
}
