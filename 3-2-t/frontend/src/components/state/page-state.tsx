interface PageStateProps {
  title: string;
  message?: string;
}

export function LoadingPageState({ title, message }: PageStateProps) {
  return (
    <main className="panel stack" aria-busy="true">
      <h2>{title}</h2>
      {message ? <p>{message}</p> : null}
    </main>
  );
}

export function ErrorPageState({ title, message }: PageStateProps) {
  return (
    <main className="panel stack" role="alert">
      <h2>{title}</h2>
      {message ? <p>{message}</p> : null}
    </main>
  );
}

export function EmptyPageState({ title, message }: PageStateProps) {
  return (
    <section className="panel stack">
      <h3>{title}</h3>
      {message ? <p>{message}</p> : null}
    </section>
  );
}
