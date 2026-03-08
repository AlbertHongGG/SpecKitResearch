export function PastDueBanner({ status, gracePeriodEndAt }: { status?: string; gracePeriodEndAt?: string }) {
  if (status !== 'PastDue' && status !== 'Suspended') return null;

  return (
    <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      {status === 'PastDue'
        ? `付款失敗，請於寬限期內完成付款。${gracePeriodEndAt ? `截止：${gracePeriodEndAt}` : ''}`
        : '帳號已停權，請完成欠款支付以恢復。'}
    </div>
  );
}
