import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { AppShell } from '../../app/layout/AppShell'
import { ForbiddenPage } from './ForbiddenPage'
import { NotFoundPage } from './NotFoundPage'
import { ServerErrorPage } from './ServerErrorPage'

export function RootErrorElement() {
  const err = useRouteError()

  let content: JSX.Element

  if (isRouteErrorResponse(err)) {
    if (err.status === 403) {
      content = <ForbiddenPage />
    } else if (err.status === 404) {
      content = <NotFoundPage />
    } else {
      content = <ServerErrorPage title={`錯誤 (${err.status})`} description={err.statusText} />
    }
  } else if (err instanceof Error) {
    content = <ServerErrorPage description={err.message} />
  } else {
    content = <ServerErrorPage />
  }

  return <AppShell>{content}</AppShell>
}
