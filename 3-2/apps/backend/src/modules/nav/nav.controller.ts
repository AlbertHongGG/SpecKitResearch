import { Controller, Get, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { SessionGuard } from '../../common/auth/session.guard.js';
import type { RequestWithUser } from '../../common/auth/session.guard.js';

@Controller('nav')
export class NavController {
  @Get()
  @UseGuards(SessionGuard)
  async getNav(@CurrentUser() user: RequestWithUser['user']) {
    const items: Array<{ label: string; href: string }> = [
      { label: 'Organizations', href: '/orgs' },
    ];

    if (user?.platformRole === 'platform_admin') {
      items.unshift({ label: 'Platform', href: '/platform/orgs' });
    }

    items.push({ label: 'Audit', href: '/audit' });

    return { items };
  }
}
