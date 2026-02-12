"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/src/ui/components/Button";
import { Input } from "@/src/ui/components/Input";
import { ApiError, apiFetch } from "@/src/ui/api/client";
import { makeZodResolver } from "@/src/ui/forms/formHelpers";
import { registerSchema, RegisterForm } from "@/src/ui/forms/zodSchemas";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const form = useForm<RegisterForm>({
    resolver: makeZodResolver(registerSchema),
    defaultValues: { email: "", password: "" },
  });

  const returnTo = searchParams.get("returnTo") ?? undefined;

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-xl font-semibold">註冊</h1>
      <form
        className="mt-6 space-y-4"
        onSubmit={form.handleSubmit(async (values) => {
          form.clearErrors("root");
          try {
            const res = await apiFetch<{ redirectTo: string }>("/api/auth/register", {
              method: "POST",
              json: { email: values.email, password: values.password, returnTo },
            });
            await queryClient.invalidateQueries({ queryKey: ["session", "me"] });
            router.push(res.redirectTo);
          } catch (err) {
            const message = err instanceof ApiError ? err.message : "註冊失敗";
            form.setError("root", { message });
          }
        })}
      >
        <Input
          label="Email"
          type="email"
          {...form.register("email")}
          error={form.formState.errors.email?.message}
        />
        <Input
          label="密碼"
          type="password"
          {...form.register("password")}
          error={form.formState.errors.password?.message}
        />

        {form.formState.errors.root?.message ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {form.formState.errors.root.message}
          </div>
        ) : null}

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "建立中…" : "建立帳號"}
        </Button>
      </form>
    </main>
  );
}
