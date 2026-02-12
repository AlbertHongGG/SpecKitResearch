"use client";

import { useRouter } from "next/navigation";
import { ThreadForm } from "@/components/forms/ThreadForm";

export default function NewThreadPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">發表主題</h1>
      <ThreadForm
        onCreated={(id) => {
          router.push(`/threads/${id}`);
        }}
      />
    </div>
  );
}
