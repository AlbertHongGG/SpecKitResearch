import { ConflictException, Injectable } from '@nestjs/common';

@Injectable()
export class SchemaLockService {
  locked(structuralFields: string[], status: string) {
    throw new ConflictException({
      message: 'Survey schema is locked; structural edits are not allowed',
      details: [
        {
          code: 'SCHEMA_LOCKED',
          message: `Status=${status}; attempted=${structuralFields.join(',') || '(unknown)'}`
        }
      ]
    });
  }
}
