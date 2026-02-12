const MAX_TOKENS = 8;

function normalize(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

function sanitizeToken(token: string) {
  // Keep it conservative: letters, numbers, underscore, dash.
  const t = token.replace(/[^\p{L}\p{N}_-]+/gu, "");
  return t.slice(0, 50);
}

export function buildFtsQuery(input: string) {
  const q = normalize(input);
  if (!q) return "";

  const tokens = q
    .split(" ")
    .map(sanitizeToken)
    .filter(Boolean)
    .slice(0, MAX_TOKENS);

  // AND all tokens with quotes (phrase) to avoid syntax errors.
  return tokens.map((t) => `"${t}"`).join(" AND ");
}
