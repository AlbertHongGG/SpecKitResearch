import { LoginForm } from '../../features/auth/LoginForm';

export default function LoginPage({
    searchParams,
}: {
    searchParams?: { returnTo?: string | string[] };
}) {
    const returnTo = typeof searchParams?.returnTo === 'string' ? searchParams.returnTo : '/projects';
    return <LoginForm returnTo={returnTo} />;
}
