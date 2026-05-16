// frontend/src/lib/utils/logger.ts — Structured logger with timestamps and levels

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_NUM: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

const MIN_LEVEL: LogLevel =
  ((typeof process !== 'undefined' && process.env.LOG_LEVEL) as LogLevel) || 'info';

const ts = () => new Date().toISOString();
const lpad = (s: string, n: number) => s.padEnd(n);

function log(level: LogLevel, label: string, message: string, data?: unknown) {
  if (LEVEL_NUM[level] < LEVEL_NUM[MIN_LEVEL]) return;
  const prefix = `${ts()} ${lpad(`[${level.toUpperCase()}]`, 7)} [${label}]`;
  if (data !== undefined) {
    console[level](`${prefix} ${message}`, JSON.stringify(data));
  } else {
    console[level](`${prefix} ${message}`);
  }
}

export const logger = {
  debug: (label: string, message: string, data?: unknown) => log('debug', label, message, data),
  info: (label: string, message: string, data?: unknown) => log('info', label, message, data),
  warn: (label: string, message: string, data?: unknown) => log('warn', label, message, data),
  error: (label: string, message: string, data?: unknown) => log('error', label, message, data),
};
