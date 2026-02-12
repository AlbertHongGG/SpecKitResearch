import { Link, Outlet } from 'react-router-dom';
import { useAuthStore } from '../features/auth/authStore';

export function AppLayout() {
    const me = useAuthStore((s) => s.me);
    const logout = useAuthStore((s) => s.logout);

    return (
        <div style={{ maxWidth: 980, margin: '0 auto', padding: 16 }}>
            <header style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
                <strong>Leave System</strong>
                <nav style={{ display: 'flex', gap: 12, flex: 1 }}>
                    <Link to="/me/balances">我的額度</Link>
                    <Link to="/me/leave-requests">我的請假</Link>
                    {me?.role === 'manager' ? (
                        <>
                            <Link to="/manager/pending">待審核</Link>
                            <Link to="/manager/calendar">日曆</Link>
                        </>
                    ) : null}
                </nav>
                <span style={{ opacity: 0.8 }}>{me ? `${me.name} (${me.role})` : ''}</span>
                <button onClick={() => void logout()}>Logout</button>
            </header>
            <main>
                <Outlet />
            </main>
        </div>
    );
}
