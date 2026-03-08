export type MetricsSnapshot = {
  unauthorized_401_count: number;
  forbidden_403_count: number;
  rate_limited_429_count: number;
  server_error_5xx_count: number;
};

export class MetricsService {
  private unauthorized401 = 0;
  private forbidden403 = 0;
  private rateLimited429 = 0;
  private serverError5xx = 0;

  recordStatus(statusCode: number): void {
    if (statusCode === 401) this.unauthorized401 += 1;
    else if (statusCode === 403) this.forbidden403 += 1;
    else if (statusCode === 429) this.rateLimited429 += 1;
    else if (statusCode >= 500 && statusCode <= 599) this.serverError5xx += 1;
  }

  snapshot(): MetricsSnapshot {
    return {
      unauthorized_401_count: this.unauthorized401,
      forbidden_403_count: this.forbidden403,
      rate_limited_429_count: this.rateLimited429,
      server_error_5xx_count: this.serverError5xx,
    };
  }

  reset(): void {
    this.unauthorized401 = 0;
    this.forbidden403 = 0;
    this.rateLimited429 = 0;
    this.serverError5xx = 0;
  }
}

export function registerMetricsHook(fastify: any, metrics: MetricsService): void {
  fastify.addHook('onResponse', async (_request: any, reply: any) => {
    metrics.recordStatus(reply.statusCode);
  });
}
