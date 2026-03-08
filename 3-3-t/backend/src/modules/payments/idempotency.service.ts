import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  async isDuplicate(provider: string, providerAccountId: string, externalEventId: string) {
    const existing = await this.prisma.idempotencyEvent.findUnique({
      where: {
        provider_providerAccountId_externalEventId: {
          provider,
          providerAccountId,
          externalEventId,
        },
      },
    });
    return Boolean(existing);
  }

  register(provider: string, providerAccountId: string, externalEventId: string, payload: unknown) {
    return this.prisma.idempotencyEvent.create({
      data: {
        provider,
        providerAccountId,
        externalEventId,
        payload: JSON.stringify(payload),
      },
    });
  }
}
