const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const SCRIPT_BLOCKS = /<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;
const HTML_TAGS = /<[^>]+>/g;
const HTML_ENTITIES = /&(nbsp|amp|lt|gt|quot|#39);/gi;

function decodeEntity(entity: string): string {
  switch (entity.toLowerCase()) {
    case '&nbsp;':
      return ' ';
    case '&amp;':
      return '&';
    case '&lt;':
      return '<';
    case '&gt;':
      return '>';
    case '&quot;':
      return '"';
    case '&#39;':
      return "'";
    default:
      return entity;
  }
}

function sanitizeValue(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(CONTROL_CHARACTERS, '')
    .replace(SCRIPT_BLOCKS, ' ')
    .replace(/javascript:/gi, '')
    .replace(/on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(HTML_TAGS, ' ')
    .replace(HTML_ENTITIES, (match) => decodeEntity(match))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export function sanitizePlainText(value: string): string {
  return sanitizeValue(value);
}

export function sanitizeRichText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const sanitized = sanitizeValue(value);
  return sanitized.length > 0 ? sanitized : null;
}
