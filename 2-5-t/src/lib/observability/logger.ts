export type Logger = {
  info: (message: string, extra?: Record<string, unknown>) => void;
  warn: (message: string, extra?: Record<string, unknown>) => void;
  error: (message: string, extra?: Record<string, unknown>) => void;
};

export function createLogger(requestId: string): Logger {
  const base = { requestId };

  return {
    info: (message, extra) => console.info(message, { ...base, ...extra }),
    warn: (message, extra) => console.warn(message, { ...base, ...extra }),
    error: (message, extra) => console.error(message, { ...base, ...extra }),
  };
}
