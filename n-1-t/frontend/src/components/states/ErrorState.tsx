export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-red-700">載入失敗：{message}</div>
      {onRetry ? (
        <button type="button" className="rounded border px-3 py-1 text-sm" onClick={onRetry}>
          重試
        </button>
      ) : null}
    </div>
  );
}
