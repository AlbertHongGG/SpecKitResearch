export type MeterCode = 'API_CALLS' | 'STORAGE_BYTES' | 'USER_COUNT' | 'PROJECT_COUNT';

export const METER_CODES: MeterCode[] = [
  'API_CALLS',
  'STORAGE_BYTES',
  'USER_COUNT',
  'PROJECT_COUNT',
];

export type MeterPolicy = 'block' | 'throttle' | 'overage';

export type MeterStatus = 'ok' | 'nearLimit' | 'overLimit';
