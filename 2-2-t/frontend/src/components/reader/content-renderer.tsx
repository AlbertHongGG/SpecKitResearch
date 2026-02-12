export function ContentRenderer({ text }: { text: string }) {
  // Render as plain text (no HTML) to avoid XSS.
  return <div className="whitespace-pre-wrap text-sm leading-6">{text}</div>;
}
