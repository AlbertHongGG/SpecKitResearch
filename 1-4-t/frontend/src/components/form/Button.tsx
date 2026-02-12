export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' },
) {
  const variant = props.variant ?? 'primary'
  const base = 'rounded px-3 py-2 text-sm font-medium disabled:opacity-50'
  const cls =
    variant === 'primary'
      ? `${base} bg-slate-900 text-white hover:bg-slate-800`
      : `${base} bg-white text-slate-900 border hover:bg-slate-50`

  return <button {...props} className={`${cls} ${props.className ?? ''}`} />
}
