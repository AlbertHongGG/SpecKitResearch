import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class ServiceRoutingService {
  // In a real deployment, this would map to upstream base URLs.
  // For this repo's US1 demo, we implement an in-process handler.
  async handle(serviceName: string, method: string, path: string): Promise<unknown> {
    if (serviceName === 'demo' && method.toUpperCase() === 'GET' && path === '/demo/ping') {
      return { ok: true, service: 'demo', path };
    }

    throw new NotFoundException();
  }
}
