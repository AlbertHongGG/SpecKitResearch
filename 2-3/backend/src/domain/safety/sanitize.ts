export function sanitizePlainText(input: string, maxLength: number): string {
    const normalized = input.normalize('NFC').replaceAll('\u0000', '');
    const trimmed = normalized.trim();
    if (trimmed.length <= maxLength) return trimmed;
    return trimmed.slice(0, maxLength);
}

export function sanitizeOptionalPlainText(
    input: string | null | undefined,
    maxLength: number,
): string | null {
    if (input === undefined) return null;
    if (input === null) return null;
    const value = sanitizePlainText(input, maxLength);
    return value.length ? value : null;
}
