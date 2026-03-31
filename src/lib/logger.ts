type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  context?: string
  timestamp: string
  data?: Record<string, unknown>
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const CURRENT_LOG_LEVEL: LogLevel =
  typeof process !== 'undefined' && process.env.NODE_ENV === 'production' ? 'warn' : 'debug'

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LOG_LEVEL]
}

function formatEntry(entry: LogEntry): string {
  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`
  const ctx = entry.context ? ` [${entry.context}]` : ''
  return `${prefix}${ctx} ${entry.message}`
}

function emit(level: LogLevel, message: string, context?: string, data?: Record<string, unknown>) {
  if (!shouldLog(level)) return

  const entry: LogEntry = {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
    data,
  }

  const formatted = formatEntry(entry)

  switch (level) {
    case 'error':
      console.error(formatted, data ?? '')
      break
    case 'warn':
      console.warn(formatted, data ?? '')
      break
    case 'info':
      console.info(formatted, data ?? '')
      break
    default:
      console.debug(formatted, data ?? '')
  }
}

export const logger = {
  debug: (message: string, context?: string, data?: Record<string, unknown>) =>
    emit('debug', message, context, data),
  info: (message: string, context?: string, data?: Record<string, unknown>) =>
    emit('info', message, context, data),
  warn: (message: string, context?: string, data?: Record<string, unknown>) =>
    emit('warn', message, context, data),
  error: (message: string, context?: string, data?: Record<string, unknown>) =>
    emit('error', message, context, data),

  scoped: (context: string) => ({
    debug: (message: string, data?: Record<string, unknown>) => emit('debug', message, context, data),
    info: (message: string, data?: Record<string, unknown>) => emit('info', message, context, data),
    warn: (message: string, data?: Record<string, unknown>) => emit('warn', message, context, data),
    error: (message: string, data?: Record<string, unknown>) => emit('error', message, context, data),
  }),
}
