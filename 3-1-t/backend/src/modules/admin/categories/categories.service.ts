import { Injectable } from '@nestjs/common';

import { AuditActions } from '../../../common/audit/audit-actions';
import { AuditService } from '../../../common/audit/audit.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.category.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(body: { name: string }, actorId?: string) {
    const created = await this.prisma.category.create({
      data: { name: body.name },
    });
    await this.audit.write({
      actorId,
      actorRole: 'ADMIN',
      action: AuditActions.CATALOG_PRODUCT_CREATE,
      targetType: 'Category',
      targetId: created.id,
      metadata: body,
    });
    return created;
  }

  async update(
    id: string,
    body: { name?: string; status?: 'ACTIVE' | 'INACTIVE' },
    actorId?: string,
  ) {
    const updated = await this.prisma.category.update({
      where: { id },
      data: body,
    });
    await this.audit.write({
      actorId,
      actorRole: 'ADMIN',
      action: AuditActions.CATALOG_PRODUCT_UPDATE,
      targetType: 'Category',
      targetId: updated.id,
      metadata: body,
    });
    return updated;
  }
}
