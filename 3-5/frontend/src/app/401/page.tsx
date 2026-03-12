import Link from 'next/link';

export default function Page401() {
    return (
        <div className="mx-auto max-w-md py-16">
            <h1 className="text-xl font-semibold">401 未登入</h1>
            <p className="mt-2 text-sm text-slate-600">請先登入後再繼續。</p>
            <Link className="mt-6 inline-block rounded bg-slate-900 px-4 py-2 text-sm text-white" href="/login">
                前往登入
            </Link>
        </div>
    );
}
