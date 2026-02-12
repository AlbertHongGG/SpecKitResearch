import { Link } from 'react-router-dom';

export function Error401Page() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900">401 未登入</h1>
      <p className="mt-2 text-sm text-gray-600">請先登入後再繼續。</p>
      <div className="mt-4">
        <Link to="/login" className="text-sm text-indigo-600 underline">
          前往登入
        </Link>
      </div>
    </div>
  );
}
