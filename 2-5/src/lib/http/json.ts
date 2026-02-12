import { z, ZodError } from "zod";
import { ApiError } from "@/lib/errors/apiError";

export async function readJson<T extends z.ZodTypeAny>(req: Request, schema: T): Promise<z.infer<T>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw ApiError.validation(undefined, "JSON 解析失敗");
  }

  try {
    return schema.parse(json);
  } catch (err) {
    if (err instanceof ZodError) {
      throw ApiError.validation(err.flatten());
    }
    throw err;
  }
}

export function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(init?.headers ?? {}),
    },
  });
}
