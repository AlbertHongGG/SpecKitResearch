import { Injectable } from '@nestjs/common';

import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../shared/db/prisma.service';

@Injectable()
export class ServicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<any[]> {
    return this.prisma.apiService.findMany({ orderBy: { createdAt: 'desc' } });
  }

  findById(id: string): Promise<any | null> {
    return this.prisma.apiService.findUnique({ where: { id } });
  }

  create(input: Prisma.ApiServiceCreateInput, tx?: Prisma.TransactionClient): Promise<any> {
    const client: any = tx ?? this.prisma;
    return client.apiService.create({ data: input });
  }

  update(id: string, input: Prisma.ApiServiceUpdateInput, tx?: Prisma.TransactionClient): Promise<any> {
    const client: any = tx ?? this.prisma;
    return client.apiService.update({ where: { id }, data: input });
  }
}
