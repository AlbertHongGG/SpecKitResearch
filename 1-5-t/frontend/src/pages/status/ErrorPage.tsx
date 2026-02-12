import { useRouteError } from 'react-router-dom';
import { ErrorState } from '../../components/status/ErrorState';

export function ErrorPage() {
  const err = useRouteError();
  return <ErrorState title="頁面錯誤" error={err} />;
}
