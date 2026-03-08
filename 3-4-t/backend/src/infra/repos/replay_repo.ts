import type { Prisma, PrismaClient, ReplayRun } from '@prisma/client';

type DbClient = PrismaClient | Prisma.TransactionClient;

export class ReplayRepository {
  constructor(private prisma: DbClient) {}

  async create(params: { orderId: string; scope: string; requestedByUserId?: string | null }) {
    return this.prisma.replayRun.create({
      data: {
        order_id: params.orderId,
        scope: params.scope,
        requested_by_user_id: params.requestedByUserId ?? null,
        status: 'created',
      },
    });
  }

  async markSucceeded(id: string) {
    return this.prisma.replayRun.update({ where: { id }, data: { status: 'succeeded', error_message: null } });
  }

  async markFailed(id: string, errorMessage: string) {
    return this.prisma.replayRun.update({ where: { id }, data: { status: 'failed', error_message: errorMessage } });
  }
}
