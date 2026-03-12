import { RegisterForm } from '../../features/auth/RegisterForm';

export default function RegisterPage({
    searchParams,
}: {
    searchParams?: { returnTo?: string | string[] };
}) {
    const returnTo = typeof searchParams?.returnTo === 'string' ? searchParams.returnTo : '/projects';
    return <RegisterForm returnTo={returnTo} />;
}
