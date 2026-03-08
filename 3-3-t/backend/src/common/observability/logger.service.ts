import { Injectable } from '@nestjs/common';

@Injectable()
export class LoggerService {
  info(message: string, payload?: Record<string, unknown>) {
    console.log(JSON.stringify({ level: 'info', message, ...payload }));
  }

  error(message: string, payload?: Record<string, unknown>) {
    console.error(JSON.stringify({ level: 'error', message, ...payload }));
  }
}
