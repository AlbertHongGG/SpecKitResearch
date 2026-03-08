export function ErrorState({ title = 'Error', message }: { title?: string; message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6" role="alert" aria-live="polite">
      <h2 className="text-base font-semibold text-red-900">{title}</h2>
      <p className="mt-2 text-sm text-red-800">{message}</p>
    </div>
  );
}
