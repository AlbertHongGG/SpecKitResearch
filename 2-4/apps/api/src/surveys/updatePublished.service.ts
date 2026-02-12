import { Injectable, ConflictException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UpdatePublishedService {
  constructor(private readonly prisma: PrismaService) {}

  async updatePublished(surveyId: string, patch: unknown) {
    if (typeof patch !== 'object' || patch === null) {
      throw new ConflictException('Invalid patch');
    }

    const obj = patch as Record<string, unknown>;
    const allowedKeys = new Set(['title', 'description']);
    for (const key of Object.keys(obj)) {
      if (!allowedKeys.has(key)) {
        throw new ConflictException('Survey is not editable after publish');
      }
    }

    const title = obj.title;
    const description = obj.description;

    await this.prisma.survey.update({
      where: { id: surveyId },
      data: {
        title: typeof title === 'string' ? title : undefined,
        description:
          typeof description === 'string' ? description : description === null ? null : undefined,
      },
    });

    return { ok: true };
  }
}
