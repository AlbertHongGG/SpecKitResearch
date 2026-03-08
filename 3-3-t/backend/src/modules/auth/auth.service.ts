import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async signup(input: { email: string; password: string; organizationName: string }) {
    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await this.prisma.user.create({
      data: { email: input.email, passwordHash },
    });

    const org = await this.prisma.organization.create({
      data: { name: input.organizationName },
    });

    await this.prisma.organizationMember.create({
      data: { organizationId: org.id, userId: user.id, role: 'ORG_ADMIN' },
    });

    return { user, organization: org };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException({ code: 'AUTH_UNAUTHORIZED', message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException({ code: 'AUTH_UNAUTHORIZED', message: 'Invalid credentials' });
    }

    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId: user.id, status: 'ACTIVE' },
      select: { organizationId: true },
    });

    return {
      ...user,
      organizationIds: memberships.map((m) => m.organizationId),
    };
  }
}
