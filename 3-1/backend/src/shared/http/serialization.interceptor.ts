import {
  CallHandler,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, type Observable } from 'rxjs';
import { sanitizeForJson } from './serialization';

@Injectable()
export class SerializationInterceptor implements NestInterceptor {
  intercept(_context: any, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => sanitizeForJson(data)));
  }
}
