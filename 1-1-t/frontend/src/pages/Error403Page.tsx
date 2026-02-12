import { Link } from 'react-router-dom';

export function Error403Page() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900">403 無權限</h1>
      <p className="mt-2 text-sm text-gray-600">你沒有權限存取此頁面。</p>
      <div className="mt-4">
        <Link to="/" className="text-sm text-indigo-600 underline">
          回到活動列表
        </Link>
      </div>
    </div>
  );
}
