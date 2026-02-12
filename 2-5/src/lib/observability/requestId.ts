export function getOrCreateRequestId(request: Request) {
  const header = request.headers.get("x-request-id");
  if (header && header.length < 200) return header;
  return crypto.randomUUID();
}
