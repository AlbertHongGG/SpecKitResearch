export function Completion({
  responseId,
  publishHash,
  responseHash
}: {
  responseId: string;
  publishHash: string;
  responseHash: string;
}) {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Submitted</h1>
      <div className="rounded border bg-white p-4 text-sm">
        <div>
          <span className="text-gray-500">response_id</span>: {responseId}
        </div>
        <div>
          <span className="text-gray-500">publish_hash</span>: {publishHash}
        </div>
        <div>
          <span className="text-gray-500">response_hash</span>: {responseHash}
        </div>
      </div>
      <p className="text-gray-700">Your answers are immutable after submission.</p>
    </div>
  );
}
