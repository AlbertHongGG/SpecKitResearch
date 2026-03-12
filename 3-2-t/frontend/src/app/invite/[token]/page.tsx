'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

import { useSession } from '@/lib/auth/session-context';
import { acceptInvite } from '@/services/invites/invite-api';

export default function Page() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const session = useSession();
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const token = params.token;

  return (
    <section className="panel form-panel">
      <div>
        <p className="eyebrow">Organization invite</p>
        <h2>Accept invite</h2>
      </div>
      <p>Invite token: {token}</p>
      <div className="actions">
        <button
          className="button"
          disabled={status === 'submitting' || !session.authenticated}
          type="button"
          onClick={async () => {
            setStatus('submitting');
            setMessage(null);

            try {
              const result = await acceptInvite(token);
              await session.refresh();
              setStatus('success');
              setMessage(`Joined ${result.organizationName}.`);
              router.push('/orgs');
            } catch (caught) {
              setStatus('idle');
              setMessage(
                caught instanceof Error
                  ? caught.message
                  : typeof caught === 'object' && caught !== null && 'message' in caught
                    ? String(caught.message)
                    : 'Failed to accept invite.',
              );
            }
          }}
        >
          {status === 'submitting' ? 'Accepting...' : 'Accept invite'}
        </button>
        {!session.authenticated ? (
          <Link className="button button-secondary" href={`/login?returnUrl=/invite/${token}`}>
            Sign in first
          </Link>
        ) : null}
      </div>
      {message ? <p>{message}</p> : null}
    </section>
  );
}
