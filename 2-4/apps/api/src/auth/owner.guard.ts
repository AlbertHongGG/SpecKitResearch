import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const userId = req.session.userId;
    if (!userId) throw new UnauthorizedException('Not authenticated');

    const surveyId = (req.params as Record<string, string | undefined>)?.surveyId;
    if (!surveyId) return true;

    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
      select: { owner_user_id: true },
    });

    if (!survey) throw new NotFoundException('Survey not found');
    if (survey.owner_user_id !== userId) throw new ForbiddenException('Not owner');

    return true;
  }
}
