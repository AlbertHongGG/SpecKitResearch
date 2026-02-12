import Link from 'next/link';

export default function Custom404() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '64px 16px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>404 找不到頁面</h1>
      <p style={{ marginTop: 8, color: '#4b5563' }}>此頁面不存在。</p>
      <div style={{ marginTop: 24 }}>
        <Link href="/courses" style={{ color: '#2563eb', fontSize: 14 }}>
          前往課程列表
        </Link>
      </div>
    </div>
  );
}
