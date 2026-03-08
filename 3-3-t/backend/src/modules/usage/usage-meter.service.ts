import { Injectable } from '@nestjs/common';

@Injectable()
export class UsageMeterService {
  readonly defaultLimits = {
    API_CALLS: 100000,
    STORAGE_BYTES: 10737418240,
    USER_COUNT: 20,
    PROJECT_COUNT: 100,
  } as const;

  readonly defaultStrategies = {
    API_CALLS: 'Throttle',
    STORAGE_BYTES: 'Block',
    USER_COUNT: 'Block',
    PROJECT_COUNT: 'Block',
  } as const;
}
