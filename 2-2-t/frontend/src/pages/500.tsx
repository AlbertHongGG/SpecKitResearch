import Link from 'next/link';

export default function Custom500() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '64px 16px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>500 系統錯誤</h1>
      <p style={{ marginTop: 8, color: '#4b5563' }}>系統發生錯誤，請稍後再試。</p>
      <div style={{ marginTop: 24 }}>
        <Link href="/" style={{ color: '#2563eb', fontSize: 14 }}>
          回首頁
        </Link>
      </div>
    </div>
  );
}
