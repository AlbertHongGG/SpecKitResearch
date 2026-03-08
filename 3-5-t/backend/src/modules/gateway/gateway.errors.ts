import { ForbiddenException, HttpException, HttpStatus, NotFoundException, UnauthorizedException } from '@nestjs/common';

export function unauthorized() {
  return new UnauthorizedException('Unauthorized');
}

export function forbidden() {
  return new ForbiddenException('Forbidden');
}

export function notFound() {
  return new NotFoundException('Not found');
}

export function rateLimited() {
  return new HttpException('Rate limited', HttpStatus.TOO_MANY_REQUESTS);
}
