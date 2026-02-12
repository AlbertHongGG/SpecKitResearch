export function SafeText(props: {
  value: string | null | undefined;
  className?: string;
  as?: 'span' | 'div' | 'p' | 'pre';
}) {
  // React text rendering is XSS-safe by default; this component centralizes formatting rules.
  const Tag = props.as ?? 'span';
  const base = 'whitespace-pre-wrap break-words';
  const className = props.className ? `${base} ${props.className}` : base;
  return <Tag className={className}>{props.value ?? ''}</Tag>;
}
