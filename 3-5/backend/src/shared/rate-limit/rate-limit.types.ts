export type RateLimitWindow = 'minute' | 'hour';

export type RateLimitLimits = {
  perMinute: number;
  perHour: number;
};

export type RateLimitCheckInput = {
  apiKeyId: string;
  endpointId?: string;
  override?: Partial<RateLimitLimits>;
};

export type RateLimitDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number; window: RateLimitWindow };
