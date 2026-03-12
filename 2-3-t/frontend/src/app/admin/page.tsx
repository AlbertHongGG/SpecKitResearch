import Link from 'next/link';

export default function AdminHome() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Admin</h1>
      <div className="flex flex-wrap gap-3">
        <Link className="rounded border px-4 py-2" href="/admin/services">Services</Link>
        <Link className="rounded border px-4 py-2" href="/admin/endpoints">Endpoints</Link>
        <Link className="rounded border px-4 py-2" href="/admin/scopes">Scopes</Link>
        <Link className="rounded border px-4 py-2" href="/admin/scope-rules">Scope rules</Link>
        <Link className="rounded border px-4 py-2" href="/admin/usage">Usage</Link>
        <Link className="rounded border px-4 py-2" href="/admin/audit">Audit</Link>
        <Link className="rounded border px-4 py-2" href="/admin/keys">Keys</Link>
        <Link className="rounded border px-4 py-2" href="/admin/users">Users</Link>
      </div>
    </div>
  );
}
