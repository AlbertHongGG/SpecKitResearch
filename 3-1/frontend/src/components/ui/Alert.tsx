type Props = {
  variant?: 'info' | 'success' | 'warning' | 'error';
  children: React.ReactNode;
};

const variants: Record<NonNullable<Props['variant']>, string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-900',
  success: 'border-green-200 bg-green-50 text-green-900',
  warning: 'border-yellow-200 bg-yellow-50 text-yellow-900',
  error: 'border-red-200 bg-red-50 text-red-900',
};

export function Alert({ variant = 'info', children }: Props) {
  return (
    <div className={`rounded border px-3 py-2 text-sm ${variants[variant]}`}>
      {children}
    </div>
  );
}
