export function Skeleton({ className }: { className?: string }) {
  return <div className={['animate-pulse rounded-md bg-gray-200', className].filter(Boolean).join(' ')} />;
}
