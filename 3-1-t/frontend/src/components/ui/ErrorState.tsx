export function ErrorState({
  title = 'Something went wrong',
  description,
  retry,
}: {
  title?: string;
  description?: string;
  retry?: () => void;
}) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <p className="font-semibold">{title}</p>
      {description ? <p className="mt-1">{description}</p> : null}
      {retry ? (
        <button className="mt-3 rounded border border-red-300 px-3 py-1" onClick={retry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}
