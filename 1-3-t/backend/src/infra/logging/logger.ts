export function buildLogger() {
  const nodeEnv = process.env.NODE_ENV ?? 'development';

  return {
    level: process.env.LOG_LEVEL ?? (nodeEnv === 'development' ? 'debug' : 'info'),
    redact: {
      paths: ['req.headers.cookie', 'req.headers.authorization'],
      remove: true,
    },
  };
}
