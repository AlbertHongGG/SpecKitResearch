import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../prisma/prisma.service.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';
import { MAILER, type Mailer } from '../../common/mailer/mailer.js';
import { hashPassword } from '../../common/auth/password.js';
import { setSessionCookie } from '../../common/auth/session-cookie.js';
import type { Response } from 'express';
import { SessionService } from '../auth/session.service.js';
import type { RequestWithUser } from '../../common/auth/session.guard.js';
import { AuditService } from '../audit/audit.service.js';
import { auditInviteAccepted, auditInviteCreated } from './org-invites.audit.js';

@Injectable()
export class OrgInvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
    @Inject(MAILER) private readonly mailer: Mailer,
    private readonly audit: AuditService,
  ) {}

  async createInvite(orgId: string, invitedByUserId: string, email: string) {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    const invite = await this.prisma.organizationInvite.create({
      data: { organizationId: orgId, invitedByUserId, email, token, expiresAt },
    });

    await this.mailer.send({
      to: email,
      subject: 'Jira Lite invite',
      text: `You have been invited. Token: ${token}`,
    });

    const inviter = await this.prisma.user.findUnique({ where: { id: invitedByUserId } });
    if (inviter) {
      await auditInviteCreated(this.audit, {
        actorUserId: inviter.id,
        actorEmail: inviter.email,
        organizationId: orgId,
        invite,
      });
    }

    return invite;
  }

  async acceptInvite(
    token: string,
    input: { displayName: string; password?: string },
    res: Response,
    currentUser?: RequestWithUser['user'],
  ) {
    const invite = await this.prisma.organizationInvite.findUnique({ where: { token } });

    if (!invite) {
      throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Invite not found' });
    }

    if (invite.acceptedAt) {
      throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Invite already used' });
    }

    if (invite.expiresAt.getTime() < Date.now()) {
      throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Invite expired' });
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: invite.organizationId },
      select: { status: true },
    });

    if (!org) {
      throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Organization not found' });
    }

    if (org.status === 'suspended') {
      throw new ForbiddenException({
        code: ErrorCodes.ORG_SUSPENDED,
        message: 'Organization suspended (read-only)',
      });
    }

    const email = invite.email.toLowerCase();

    if (currentUser && currentUser.email.toLowerCase() !== email) {
      throw new ConflictException({
        code: ErrorCodes.CONFLICT,
        message: 'Invite email mismatch. Please login with the invited email.',
      });
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user && !input.password) {
      throw new ConflictException({
        code: ErrorCodes.CONFLICT,
        message: 'Password required to create new account',
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const ensuredUser =
        user ??
        (await tx.user.create({
          data: {
            email,
            displayName: input.displayName,
            passwordHash: await hashPassword(input.password!),
          },
        }));

      await tx.organizationMembership.upsert({
        where: {
          organizationId_userId: { organizationId: invite.organizationId, userId: ensuredUser.id },
        },
        create: {
          organizationId: invite.organizationId,
          userId: ensuredUser.id,
          orgRole: 'org_member',
          status: 'active',
        },
        update: { status: 'active' },
      });

      await tx.organizationInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });

      return ensuredUser;
    });

    await auditInviteAccepted(this.audit, {
      actorUserId: result.id,
      actorEmail: result.email,
      organizationId: invite.organizationId,
      invite,
    });

    const session = await this.sessions.createSession(result.id);
    setSessionCookie(res, session.id, { secure: false });

    return { ok: true };
  }
}
