'use client';

interface ReadOnlyBannerProps {
  title: string;
  message: string;
}

export function ReadOnlyBanner({ title, message }: ReadOnlyBannerProps) {
  return (
    <aside className="read-only-banner" role="status" aria-live="polite">
      <strong>{title}</strong>
      <p>{message}</p>
    </aside>
  );
}
