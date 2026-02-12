import { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../features/auth/authStore';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { isHttpError } from '../lib/httpError';

export function LoginPage() {
    const login = useAuthStore((s) => s.login);
    const navigate = useNavigate();
    const location = useLocation();
    const from = (location.state as any)?.from ?? '/';

    const [email, setEmail] = useState('employee@example.com');
    const [password, setPassword] = useState('password123');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const hint = useMemo(() => {
        return '測試帳號：manager@example.com / employee@example.com / hr@example.com，密碼 password123';
    }, []);

    return (
        <div style={{ maxWidth: 420, margin: '64px auto', padding: 16 }}>
            <h2>登入</h2>
            <p style={{ opacity: 0.75 }}>{hint}</p>

            <div style={{ display: 'grid', gap: 12 }}>
                <label>
                    Email
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
                <label>
                    Password
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </label>
                {error ? <div style={{ color: 'crimson' }}>{error}</div> : null}
                <Button
                    disabled={loading}
                    onClick={() => {
                        setError(null);
                        setLoading(true);
                        void (async () => {
                            try {
                                await login(email, password);
                                navigate(from, { replace: true });
                            } catch (e) {
                                if (isHttpError(e)) {
                                    setError(e.message);
                                } else {
                                    setError('Login failed');
                                }
                            } finally {
                                setLoading(false);
                            }
                        })();
                    }}
                >
                    {loading ? '登入中…' : '登入'}
                </Button>
            </div>
        </div>
    );
}
