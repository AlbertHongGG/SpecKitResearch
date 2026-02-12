import type { Viewer } from "@/lib/auth/session";

export function makeViewer(params?: {
  id?: string;
  email?: string;
  role?: "user" | "admin";
  isBanned?: boolean;
  moderatorBoards?: string[];
}): Viewer {
  return {
    user: {
      id: params?.id ?? "u_1",
      email: params?.email ?? "user@example.com",
      role: params?.role ?? "user",
      isBanned: params?.isBanned ?? false,
    },
    sessionId: "s_1",
    moderatorBoards: params?.moderatorBoards ?? [],
  };
}
