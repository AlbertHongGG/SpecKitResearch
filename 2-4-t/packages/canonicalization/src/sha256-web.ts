function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function sha256HexWeb(input: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('WebCrypto subtle not available');
  }
  const bytes = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return toHex(digest);
}
