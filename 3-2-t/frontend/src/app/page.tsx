import Link from 'next/link';

export default function HomePage() {
  return (
    <section className="panel">
      <div>
        <p className="eyebrow">Foundation checkpoint</p>
        <h2>Frontend runtime is wired.</h2>
      </div>
      <p>
        Phase 1 and Phase 2 are focused on establishing a reliable shell. User-story pages remain pending, but the
        application can now boot, render providers, and talk to the backend session endpoint.
      </p>
      <div className="actions">
        <Link className="button" href="/login">
          Open login shell
        </Link>
        <a className="button button-secondary" href="http://localhost:4000/api/health">
          Backend health
        </a>
      </div>
    </section>
  );
}