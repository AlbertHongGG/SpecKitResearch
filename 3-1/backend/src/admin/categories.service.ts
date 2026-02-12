import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../shared/db/prisma.service';
import { ErrorCodes } from '../shared/http/error-codes';
import { AuditService } from '../audit/audit.service';
import { AuditActions } from '../audit/audit.actions';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' }, take: 200 });
  }

  async create(params: { adminUserId: string; name: string }) {
    const category = await this.prisma.category.create({ data: { name: params.name, status: 'active' } });
    await this.audit.write({
      actorUserId: params.adminUserId,
      actorRole: 'admin',
      action: AuditActions.CATEGORY_CREATE,
      targetType: 'Category',
      targetId: category.id,
      metadata: { name: category.name },
    });
    return category;
  }

  async setStatus(params: { adminUserId: string; categoryId: string; status: 'active' | 'inactive' }) {
    const existing = await this.prisma.category.findUnique({ where: { id: params.categoryId } });
    if (!existing) throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Category not found' });

    const category = await this.prisma.category.update({
      where: { id: params.categoryId },
      data: { status: params.status },
    });
    await this.audit.write({
      actorUserId: params.adminUserId,
      actorRole: 'admin',
      action: AuditActions.CATEGORY_STATUS_CHANGE,
      targetType: 'Category',
      targetId: category.id,
      metadata: { status: category.status },
    });
    return category;
  }
}
