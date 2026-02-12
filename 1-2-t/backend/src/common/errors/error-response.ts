export type ErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'validation_error'
  | 'bad_request'
  | 'internal_error';

export interface ErrorResponse {
  code: ErrorCode;
  message: string;
  details?: unknown;
  requestId?: string;
}
