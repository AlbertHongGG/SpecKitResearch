import { ExecutionContext, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import type { ScopePolicy } from '../common/guards/scope.policy';
import type { AuthUser } from '../auth/auth.types';

@Injectable()
export class ManagerScopePolicy implements ScopePolicy {
  constructor(private readonly prisma: PrismaService) {}

  async canAccess(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<{ user?: AuthUser; params?: Record<string, string> }>();
    const managerId = req.user?.userId;
    const leaveRequestId = req.params?.id;
    if (!managerId || !leaveRequestId) return false;

    const lr = await this.prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      select: { userId: true },
    });
    if (!lr) return false;
    const employee = await this.prisma.user.findUnique({
      where: { id: lr.userId },
      select: { managerId: true },
    });
    return employee?.managerId === managerId;
  }
}
