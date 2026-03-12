import Link from 'next/link';

export default function Page403() {
    return (
        <div className="mx-auto max-w-md py-16">
            <h1 className="text-xl font-semibold">403 沒有權限</h1>
            <p className="mt-2 text-sm text-slate-600">你沒有權限存取此資源。</p>
            <Link className="mt-6 inline-block rounded bg-slate-900 px-4 py-2 text-sm text-white" href="/projects">
                回到專案列表
            </Link>
        </div>
    );
}
