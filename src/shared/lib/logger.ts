/**
 * Logger terpusat — SATU titik integrasi untuk seluruh aplikasi.
 *
 * Saat ini: structured console log (cukup untuk skala 1 cabang,
 * dipantau lewat `npm run dev` saat development dan log hosting
 * platform saat production).
 *
 * Kalau nanti perlu upgrade ke external service (Sentry, dsb),
 * CUKUP UBAH ISI FILE INI — seluruh pemanggil (callRpc, Error
 * Boundary, dst) tidak perlu diubah sama sekali.
 */

type LogLevel = 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

function formatLog(level: LogLevel, message: string, context?: LogContext) {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };
}

export const logger = {
  info(message: string, context?: LogContext) {
    console.log(formatLog('info', message, context));
  },

  warn(message: string, context?: LogContext) {
    console.warn(formatLog('warn', message, context));
  },

  error(message: string, context?: LogContext) {
    console.error(formatLog('error', message, context));
    // TODO: titik integrasi Sentry/external service nanti, contoh:
    // Sentry.captureException(context?.originalError, { extra: context });
  },
};
