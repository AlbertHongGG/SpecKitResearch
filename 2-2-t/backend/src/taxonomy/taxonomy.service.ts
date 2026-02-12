import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ErrorCodes, makeError } from '@app/contracts';

@Injectable()
export class TaxonomyService {
  constructor(private readonly prisma: PrismaService) {}

  listActive() {
    return Promise.all([
      this.prisma.category.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      this.prisma.tag.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    ]);
  }

  async listAll() {
    const categories = await this.prisma.category.findMany({ orderBy: { name: 'asc' } });
    const tags = await this.prisma.tag.findMany({ orderBy: { name: 'asc' } });
    return [categories, tags] as const;
  }

  async upsertCategory(params: { id?: string; name: string; isActive?: boolean }) {
    try {
      if (params.id) {
        const existing = await this.prisma.category.findUnique({ where: { id: params.id } });
        if (!existing) throw new NotFoundException(makeError(ErrorCodes.NOT_FOUND, '分類不存在'));
        return await this.prisma.category.update({
          where: { id: params.id },
          data: { name: params.name, isActive: params.isActive ?? existing.isActive },
        });
      }
      return await this.prisma.category.create({ data: { name: params.name, isActive: params.isActive ?? true } });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new ConflictException(makeError(ErrorCodes.CONFLICT, '分類名稱已存在'));
      throw e;
    }
  }

  async upsertTag(params: { id?: string; name: string; isActive?: boolean }) {
    try {
      if (params.id) {
        const existing = await this.prisma.tag.findUnique({ where: { id: params.id } });
        if (!existing) throw new NotFoundException(makeError(ErrorCodes.NOT_FOUND, '標籤不存在'));
        return await this.prisma.tag.update({
          where: { id: params.id },
          data: { name: params.name, isActive: params.isActive ?? existing.isActive },
        });
      }
      return await this.prisma.tag.create({ data: { name: params.name, isActive: params.isActive ?? true } });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new ConflictException(makeError(ErrorCodes.CONFLICT, '標籤名稱已存在'));
      throw e;
    }
  }
}
