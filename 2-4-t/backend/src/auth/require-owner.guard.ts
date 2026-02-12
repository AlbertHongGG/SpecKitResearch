import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../shared/db/prisma.service';

@Injectable()
export class RequireOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as { id: string } | null;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    const surveyId = req.params?.id as string | undefined;
    if (!surveyId) {
      throw new ForbiddenException('Owner check requires survey id');
    }

    const survey = await this.prisma.survey.findUnique({ where: { id: surveyId } });
    if (!survey || survey.ownerUserId !== user.id) {
      throw new ForbiddenException('Not survey owner');
    }

    return true;
  }
}
