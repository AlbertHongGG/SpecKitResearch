import { NotFoundException } from '@nestjs/common';

export function maskNotFound(): never {
  throw new NotFoundException('Not found');
}
