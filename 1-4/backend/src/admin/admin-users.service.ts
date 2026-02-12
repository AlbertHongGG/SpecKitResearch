import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AuthSessionService } from '../auth/auth-session.service';
import { AuditAction, AuditEntityType, UserRole } from '@prisma/client';

function toDbUserRole(role: 'Customer' | 'Agent' | 'Admin'): UserRole {
  switch (role) {
    case 'Customer':
      return UserRole.CUSTOMER;
    case 'Agent':
      return UserRole.AGENT;
    case 'Admin':
      return UserRole.ADMIN;
  }
}

function toApiUserRole(role: UserRole): 'Customer' | 'Agent' | 'Admin' {
  switch (role) {
    case UserRole.CUSTOMER:
      return 'Customer';
    case UserRole.AGENT:
      return 'Agent';
    case UserRole.ADMIN:
      return 'Admin';
  }

  throw new Error(`Unknown role: ${String(role)}`);
}

function toApiUser(user: {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    role: toApiUserRole(user.role),
    is_active: user.isActive,
    created_at: user.createdAt.toISOString(),
    updated_at: user.updatedAt.toISOString(),
  };
}

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly sessions: AuthSessionService,
  ) {}

  async createUser(params: {
    actorId: string;
    email: string;
    role: 'Customer' | 'Agent' | 'Admin';
    isActive?: boolean;
  }) {
    // Contract does not include password; create a random passwordHash so the account cannot be guessed.
    const randomPassword = randomBytes(24).toString('hex');
    const passwordHash = await bcrypt.hash(randomPassword, 12);

    const user = await this.users.createUser({
      email: params.email,
      passwordHash,
      role: toDbUserRole(params.role),
    });

    if (params.isActive === false) {
      await this.users.setActive({ userId: user.id, isActive: false });
    }

    await this.prisma.auditLog.create({
      data: {
        entityType: AuditEntityType.USER,
        entityId: user.id,
        actorId: params.actorId,
        action: AuditAction.USER_ROLE_CHANGED,
        metadataJson: JSON.stringify({ created: true, role: params.role }),
      },
    });

    const refreshed = await this.users.findById(user.id);
    if (!refreshed) return { user: toApiUser(user) };

    return { user: toApiUser(refreshed) };
  }

  async updateUser(params: {
    actorId: string;
    userId: string;
    role?: 'Customer' | 'Agent' | 'Admin';
    isActive?: boolean;
  }) {
    const existing = await this.users.findById(params.userId);
    if (!existing) {
      return null;
    }

    if (params.role) {
      await this.users.setRole({
        userId: params.userId,
        role: toDbUserRole(params.role),
      });
      await this.prisma.auditLog.create({
        data: {
          entityType: AuditEntityType.USER,
          entityId: params.userId,
          actorId: params.actorId,
          action: AuditAction.USER_ROLE_CHANGED,
          metadataJson: JSON.stringify({
            from: toApiUserRole(existing.role),
            to: params.role,
          }),
        },
      });
    }

    if (params.isActive !== undefined) {
      await this.users.setActive({
        userId: params.userId,
        isActive: params.isActive,
      });

      if (params.isActive === false) {
        await this.sessions.revokeAllForUser(params.userId);
        await this.users.bumpTokenVersion(params.userId);

        await this.prisma.auditLog.create({
          data: {
            entityType: AuditEntityType.USER,
            entityId: params.userId,
            actorId: params.actorId,
            action: AuditAction.USER_DISABLED,
            metadataJson: JSON.stringify({ disabled: true }),
          },
        });

        await this.prisma.auditLog.create({
          data: {
            entityType: AuditEntityType.AUTH_SESSION,
            entityId: params.userId,
            actorId: params.actorId,
            action: AuditAction.SESSION_REVOKED,
            metadataJson: JSON.stringify({ revoked_all: true }),
          },
        });
      }
    }

    const updated = await this.users.findById(params.userId);
    return updated ? { user: toApiUser(updated) } : null;
  }
}
