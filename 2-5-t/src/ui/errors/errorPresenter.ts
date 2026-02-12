import { ApiError } from "@/src/ui/api/client";

type PresentedError = {
  userMessage: string;
  devMessage?: string;
};

function isProd() {
  return process.env.NODE_ENV === "production";
}

export function presentError(error: unknown): PresentedError {
  const includeDev = !isProd();

  if (error instanceof ApiError) {
    const requestId = error.requestId;

    const userMessage = (() => {
      switch (error.code) {
        case "Unauthenticated":
          return "需要登入";
        case "Forbidden":
          if (String(error.message).toLowerCase().includes("banned")) return "帳號已被停權";
          return "權限不足";
        case "NotFound":
          return "找不到資源";
        case "ValidationError":
          return "輸入內容有誤";
        case "Conflict":
          return "操作失敗（狀態衝突）";
        case "InvalidTransition":
          return "操作失敗（狀態不允許）";
        case "RateLimited":
          return "操作太頻繁，請稍後再試";
        default:
          return "發生錯誤，請稍後再試";
      }
    })();

    const devMessage = includeDev
      ? [error.code, error.message, requestId ? `requestId=${requestId}` : null].filter(Boolean).join(" | ")
      : undefined;

    return { userMessage, devMessage };
  }

  if (error instanceof Error) {
    return { userMessage: "發生錯誤，請稍後再試", devMessage: includeDev ? error.message : undefined };
  }

  return { userMessage: "發生錯誤，請稍後再試", devMessage: includeDev ? String(error) : undefined };
}
