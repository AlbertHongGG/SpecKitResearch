import { describe, expect, it } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';

import { OrgInvitesService } from '../../../apps/backend/src/modules/orgs/org-invites.service';

function makeService(fixture: {
  invite?: any;
  user?: any;
}) {
  const prisma: any = {
    organization: {
      findUnique: async () => ({ status: 'active' }),
    },
    organizationInvite: {
      create: async ({ data }: any) => ({ id: 'inv1', ...data, acceptedAt: null }),
      findUnique: async () => fixture.invite ?? null,
      update: async ({ data }: any) => ({ ...fixture.invite, ...data }),
    },
    organizationMembership: {
      upsert: async () => ({ ok: true }),
    },
    user: {
      findUnique: async ({ where }: any) => {
        if (where?.email) return fixture.user ?? null;
        if (where?.id) return fixture.user ?? null;
        return null;
      },
      create: async ({ data }: any) => ({ id: 'u_new', ...data }),
    },
    $transaction: async (fn: any) => {
      const tx = {
        user: prisma.user,
        organizationMembership: prisma.organizationMembership,
        organizationInvite: prisma.organizationInvite,
      };
      return await fn(tx);
    },
  };

  const sessions: any = {
    createSession: async () => ({ id: 's1' }),
  };

  const mailer: any = {
    send: async () => undefined,
  };

  const audit: any = {
    append: async () => undefined,
  };

  return new OrgInvitesService(prisma, sessions, mailer, audit);
}

describe('invite lifecycle', () => {
  it('rejects expired invite', async () => {
    const invite = {
      id: 'inv1',
      organizationId: 'org1',
      invitedByUserId: 'u1',
      email: 'a@example.com',
      token: 't',
      acceptedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    };

    const svc = makeService({ invite });
    await expect(svc.acceptInvite('t', { displayName: 'A', password: '12345678' }, {} as any)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects used invite', async () => {
    const invite = {
      id: 'inv1',
      organizationId: 'org1',
      invitedByUserId: 'u1',
      email: 'a@example.com',
      token: 't',
      acceptedAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60),
    };

    const svc = makeService({ invite });
    await expect(svc.acceptInvite('t', { displayName: 'A', password: '12345678' }, {} as any)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects email mismatch when logged in as different user', async () => {
    const invite = {
      id: 'inv1',
      organizationId: 'org1',
      invitedByUserId: 'u1',
      email: 'invitee@example.com',
      token: 't',
      acceptedAt: null,
      expiresAt: new Date(Date.now() + 1000 * 60),
    };

    const svc = makeService({ invite });
    await expect(
      svc.acceptInvite(
        't',
        { displayName: 'A', password: '12345678' },
        {} as any,
        { id: 'u_other', email: 'other@example.com', displayName: 'Other' } as any,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
