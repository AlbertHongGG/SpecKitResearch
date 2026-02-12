import { HttpStatus } from '@nestjs/common';

export type MappedError = {
  status: number;
  message: string;
  details: Array<{ code: string; message: string }>;
};

export function mapInternalErrorToHttp(exception: unknown): MappedError | null {
  if (!(exception instanceof Error)) return null;

  const msg = exception.message ?? '';

  const isSchemaLocked = msg.startsWith('SCHEMA_LOCKED:') || msg.startsWith('SCHEMA_LOCK_BULK_DISALLOWED:');
  if (isSchemaLocked) {
    return {
      status: HttpStatus.CONFLICT,
      message: 'Survey schema is locked',
      details: [{ code: 'SCHEMA_LOCKED', message: msg }]
    };
  }

  const isImmutable = msg.startsWith('IMMUTABLE_VIOLATION:');
  if (isImmutable) {
    return {
      status: HttpStatus.CONFLICT,
      message: 'Immutable data cannot be modified',
      details: [{ code: 'IMMUTABLE_VIOLATION', message: msg }]
    };
  }

  return null;
}
