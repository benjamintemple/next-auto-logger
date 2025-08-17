import pino, { type Logger } from "pino";

const createSimpleLogger = () =>
  pino({
    level: process.env.LOG_LEVEL || "info",
    formatters: {
      level: label => ({ level: label }),
      log: obj => ({
        ...obj,
        timestamp: new Date().toISOString(),
      }),
    },
    ...(process.env.NODE_ENV === "development" && {
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          ignore: "pid,hostname,time",
          messageFormat: "{msg}",
        },
      },
    }),
  });

let logger: Logger;

try {
  logger = createSimpleLogger();
} catch (error) {
  // Fallback to basic logger if anything fails
  console.warn("Failed to initialize logger, using console fallback:", error);
  logger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
    trace: console.trace,
    fatal: console.error,
    child: () => logger,
  } as unknown as Logger;
}

export default logger;

export { logger as pino };

/**
 * @param context.module - Required
 * @returns a logger or a silent logger if filtered out
 */
export const createChildLogger = (context: LoggerContext): Logger => {
  if (
    process.env.NODE_ENV === "development" &&
    !shouldLogModule(context.module)
  )
    return createSilentLogger();

  const base = {
    ...context,
    ...(context.filePath && {
      filePath: context.filePath.replace(process.cwd() + "/", ""),
    }),
    ...(process.env.NODE_ENV !== "development" && {
      environment: process.env.NODE_ENV || "production",
    }),
  };

  return logger.child(base) as unknown as Logger;
};

const shouldLogModule = (module: string): boolean => {
  const allowed = process.env.LOG_MODULE?.split(",").map(m => m.trim());
  return !allowed || allowed.includes(module);
};

const createSilentLogger = (): Logger =>
  ({
    info() {},
    warn() {},
    error() {},
    debug() {},
    trace() {},
    fatal() {},
    child: createSilentLogger,
  } as unknown as Logger);

export async function measureDuration<T>(
  label: string,
  fn: () => Promise<T> | T,
  log: Logger
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    log.info(
      { durationMs: +(performance.now() - start).toFixed(2), label },
      `${label} completed`
    );
    return result;
  } catch (err) {
    log.error(
      { err, durationMs: +(performance.now() - start).toFixed(2), label },
      `${label} failed`
    );
    throw err;
  }
}

export async function measureDurationQuiet<T>(
  label: string,
  fn: () => Promise<T> | T,
  log: Logger
): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  try {
    const result = await fn();
    const durationMs = +(performance.now() - start).toFixed(2);
    log.debug({ durationMs, label }, `${label} completed`);
    return { result, durationMs };
  } catch (err) {
    const durationMs = +(performance.now() - start).toFixed(2);
    log.error({ err, durationMs, label }, `${label} failed`);
    throw err;
  }
}

// Types
export interface LoggerContext {
  module: string;
  component?: string;
  filePath?: string;
  environment?: string;
}
