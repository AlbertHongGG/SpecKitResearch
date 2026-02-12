import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../shared/db/prisma.service';
import { logSurveyClosed } from '../shared/logging/events';

@Injectable()
export class CloseService {
  constructor(private readonly prisma: PrismaService) {}

  async close(ownerUserId: string, surveyId: string) {
    const survey = await this.prisma.survey.findUnique({ where: { id: surveyId } });
    if (!survey) throw new NotFoundException('Survey not found');
    if (survey.ownerUserId !== ownerUserId) throw new NotFoundException('Survey not found');

    if (survey.status !== 'PUBLISHED') {
      throw new ConflictException({
        message: 'Survey must be PUBLISHED to close',
        details: [{ code: 'INVALID_STATUS_TRANSITION', message: `Current status: ${survey.status}` }]
      });
    }

    await this.prisma.survey.update({
      where: { id: surveyId },
      data: { status: 'CLOSED' }
    });

    logSurveyClosed({ survey_id: surveyId, owner_user_id: ownerUserId });

    return this.prisma.survey.findUniqueOrThrow({ where: { id: surveyId } });
  }
}
