import { Link } from 'react-router-dom';

export function Error404Page() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900">404 找不到頁面</h1>
      <p className="mt-2 text-sm text-gray-600">你要找的頁面不存在，或已被移除。</p>
      <div className="mt-4">
        <Link to="/" className="text-sm text-indigo-600 underline">
          回到首頁
        </Link>
      </div>
    </div>
  );
}
