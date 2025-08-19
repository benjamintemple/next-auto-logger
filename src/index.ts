import pino from "pino";

// Override Pino's TypeScript definitions to match actual runtime behavior
declare module 'pino' {
  interface LogFn {
    (obj: object, msg?: string, ...args: any[]): void;
    (msg: string, ...args: any[]): void;
    (...args: any[]): void;
  }
}

// Environment detection functions - called dynamically
const getEnvironment = () => typeof window !== "undefined" ? "client" : "server";
const isServer = () => typeof window === "undefined";
const isDev = process.env.NODE_ENV === "development";

// Simple JSON-only logger configuration
const createSimpleLogger = () => {
  const baseConfig = {
    level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
    formatters: {
      level: (label: string) => ({ level: label }),
      log: (obj: any) => ({
        ...obj,
        timestamp: new Date().toISOString(),
        environment: getEnvironment(),
      }),
    },
    // Production server config for CloudWatch
    ...(!isDev && isServer() && {
      redact: ['headers.authorization', 'headers.cookie', 'body.password'],
    }),
  };

  // Always use JSON logs (no pino-pretty)
  return pino(baseConfig);
};

// Define proper logger interface that matches Pino's actual API
interface LoggerMethod {
  (obj: object, msg?: string, ...args: any[]): void;
  (msg: string, ...args: any[]): void;
  (...args: any[]): void;
}

interface ExtendedLogger {
  info: LoggerMethod;
  warn: LoggerMethod;
  error: LoggerMethod;
  debug: LoggerMethod;
  trace: LoggerMethod;
  fatal: LoggerMethod;
  child: (obj: object) => ExtendedLogger;
}

let logger: ExtendedLogger | null = null;

// Create logger dynamically based on current environment
const getLogger = () => {
  if (isServer()) {
    try {
      return createSimpleLogger();
    } catch (error) {
      console.warn("Failed to initialize server logger, using console fallback:", error);
      return {
        info: (obj: any, msg?: string) => console.log(msg || obj),
        warn: (obj: any, msg?: string) => console.warn(msg || obj),
        error: (obj: any, msg?: string) => console.error(msg || obj),
        debug: (obj: any, msg?: string) => console.debug(msg || obj),
        trace: (obj: any, msg?: string) => console.trace(msg || obj),
        fatal: (obj: any, msg?: string) => console.error(msg || obj),
        child: () => getLogger(),
      } as unknown as pino.Logger;
    }
  } else {
    // Client-side logger that sends to server API
    const createClientLogMethod = (level: string) => (obj: any, msg?: string) => {
      const message = msg || (typeof obj === 'string' ? obj : JSON.stringify(obj));
      const data = typeof obj === 'object' && obj !== null ? obj : {};
      
      // Create a manual log event to send to server
      const logEvent: RequestEvent = {
        event: 'request_success', // Use success event type for manual logs
        requestId: typeof crypto !== 'undefined' && crypto.randomUUID 
          ? crypto.randomUUID() 
          : `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.pathname : '/',
        method: 'MANUAL_LOG',
        library: 'manual',
        environment: 'client',
        status: level === 'error' ? 500 : 200,
        statusText: level.toUpperCase(),
        duration: 0,
        ...data,
        level,
        msg: message,
      };
      
      // Send to server API (will show in server logs)
      sendToServerAPI(logEvent);
    };

    return {
      info: createClientLogMethod('info'),
      warn: createClientLogMethod('warn'),
      error: createClientLogMethod('error'),
      debug: createClientLogMethod('debug'),
      trace: createClientLogMethod('trace'),
      fatal: createClientLogMethod('fatal'),
      child: () => getLogger(),
    } as unknown as pino.Logger;
  }
};

// Lazy logger initialization function
const ensureLogger = () => {
  if (!logger) {
    logger = getLogger();
  }
  return logger;
};

// Configuration interface
export interface LoggerConfig {
  enabled?: boolean;
  clientLogEndpoint?: string;
  excludeUrls?: (string | RegExp)[];
  includeBody?: boolean;
  includeHeaders?: boolean;
  contextProvider?: () => Record<string, any>;
  transformLog?: (event: RequestEvent) => RequestEvent;
  onError?: (error: Error) => void;
  autoSetupInterceptors?: boolean;
  [key: string]: any;
}

// Request event types
export interface BaseRequestEvent {
  requestId: string;
  timestamp: string;
  url: string;
  method: string;
  library: string;
  environment: 'client' | 'server';
  context?: Record<string, any>;
}

export interface RequestStartEvent extends BaseRequestEvent {
  event: 'request_start';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
}

export interface RequestSuccessEvent extends BaseRequestEvent {
  event: 'request_success';
  status: number;
  statusText?: string;
  duration: number;
  responseHeaders?: Record<string, string>;
  responseBody?: any;
  cached?: boolean;
}

export interface RequestErrorEvent extends BaseRequestEvent {
  event: 'request_error';
  error: string;
  stack?: string;
  duration: number;
  errorCode?: string | number;
  retry?: number;
}

export type RequestEvent = RequestStartEvent | RequestSuccessEvent | RequestErrorEvent;

// Global configuration
let globalConfig: LoggerConfig = {
  enabled: true,
  clientLogEndpoint: '/api/logs',
  excludeUrls: [],
  includeBody: false,
  includeHeaders: false,
  autoSetupInterceptors: true,
};

// Universal logger interface
export interface UniversalLogger {
  pino?: ExtendedLogger;
  log: (event: RequestEvent) => Promise<void>;
  info: LoggerMethod;
  warn: LoggerMethod;
  error: LoggerMethod;
  debug: LoggerMethod;
  trace: LoggerMethod;
  fatal: LoggerMethod;
  child: (obj: object) => ExtendedLogger;
  isServer: boolean;
  environment: 'client' | 'server';
}

// Helper functions
const shouldLog = (url: string): boolean => {
  if (!globalConfig.enabled) return false;
  if (url.includes(globalConfig.clientLogEndpoint!)) return false;
  
  return !globalConfig.excludeUrls?.some(pattern => {
    if (pattern instanceof RegExp) return pattern.test(url);
    return url.includes(pattern);
  });
};

const sendToServerAPI = async (event: RequestEvent): Promise<void> => {
  if (isServer() || !globalConfig.clientLogEndpoint) return;
  
  try {
    const response = await fetch(globalConfig.clientLogEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    if (globalConfig.onError) {
      globalConfig.onError(error instanceof Error ? error : new Error(String(error)));
    } else if (isDev) {
      // Only show this error once to avoid spam
      if (!sessionStorage.getItem('next-auto-logger-api-error-shown')) {
        console.warn('[next-auto-logger] API endpoint not set up. Run "npx next-auto-logger init" to create /api/logs');
        sessionStorage.setItem('next-auto-logger-api-error-shown', 'true');
      }
    }
  }
};

const logEvent = async (event: RequestEvent): Promise<void> => {
  if (!shouldLog(event.url)) return;

  // Add context if provider exists
  if (globalConfig.contextProvider) {
    event.context = { ...event.context, ...globalConfig.contextProvider() };
  }

  // Transform log if transformer exists
  const finalEvent = globalConfig.transformLog ? globalConfig.transformLog(event) : event;

  if (isServer()) {
    // Server-side: Log directly with Pino
    const level = finalEvent.event === 'request_error' ? 'error' : 'info';
    (ensureLogger() as any)[level](finalEvent);
  } else if (!isServer()) {
    // Client-side: Send to server API only (will show in npm run dev:pretty)
    await sendToServerAPI(finalEvent);
  }
};

// Create universal logger
export const createLogger = (config?: Partial<LoggerConfig>): UniversalLogger => {
  if (config) {
    globalConfig = { ...globalConfig, ...config };
  }

  // Auto-setup interceptors on client-side
  if (!isServer() && globalConfig.autoSetupInterceptors) {
    setupInterceptors();
  }

  const actualLogger = ensureLogger();
  
  return {
    pino: isServer() ? actualLogger : undefined,
    log: logEvent,
    info: actualLogger.info.bind(actualLogger),
    warn: actualLogger.warn.bind(actualLogger),
    error: actualLogger.error.bind(actualLogger),
    debug: actualLogger.debug.bind(actualLogger),
    trace: actualLogger.trace.bind(actualLogger),
    fatal: actualLogger.fatal.bind(actualLogger),
    child: (obj: object) => actualLogger.child(obj),
    isServer: isServer(),
    environment: getEnvironment(),
  };
};

// Auto-interceptor setup
let interceptorsSetup = false;

const setupInterceptors = () => {
  if (interceptorsSetup || typeof window === 'undefined') return;

  setupFetchInterceptor();
  setupAxiosInterceptor();
  interceptorsSetup = true;
};

const generateRequestId = () => {
  return typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const setupFetchInterceptor = () => {
  if (!window.fetch) return;

  const originalFetch = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
    const method = init?.method || 'GET';
    const requestId = generateRequestId();
    const startTime = performance.now();

    const startEvent: RequestStartEvent = {
      event: 'request_start',
      requestId,
      timestamp: new Date().toISOString(),
      url,
      method,
      library: 'fetch',
      environment: 'client',
    };

    if (globalConfig.includeHeaders && init?.headers) {
      startEvent.headers = init.headers as Record<string, string>;
    }

    if (globalConfig.includeBody && init?.body) {
      try {
        startEvent.body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
      } catch {
        startEvent.body = init.body;
      }
    }

    await logEvent(startEvent);

    try {
      const response = await originalFetch(input, init);
      const duration = Math.round(performance.now() - startTime);

      const successEvent: RequestSuccessEvent = {
        event: 'request_success',
        requestId,
        timestamp: new Date().toISOString(),
        url,
        method,
        library: 'fetch',
        environment: 'client',
        status: response.status,
        statusText: response.statusText,
        duration,
      };

      await logEvent(successEvent);
      return response;
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      const errorEvent: RequestErrorEvent = {
        event: 'request_error',
        requestId,
        timestamp: new Date().toISOString(),
        url,
        method,
        library: 'fetch',
        environment: 'client',
        error: error instanceof Error ? error.message : String(error),
        duration,
        stack: error instanceof Error ? error.stack : undefined,
      };

      await logEvent(errorEvent);
      throw error;
    }
  };
};

const setupAxiosInterceptor = () => {
  // Check if axios is available
  if (typeof window === 'undefined' || !(window as any).axios) return;

  const axios = (window as any).axios;

  axios.interceptors.request.use((config: any) => {
    config.metadata = {
      requestId: generateRequestId(),
      startTime: performance.now(),
    };

    const startEvent: RequestStartEvent = {
      event: 'request_start',
      requestId: config.metadata.requestId,
      timestamp: new Date().toISOString(),
      url: config.url,
      method: config.method?.toUpperCase() || 'GET',
      library: 'axios',
      environment: 'client',
      headers: globalConfig.includeHeaders ? config.headers : undefined,
      body: globalConfig.includeBody ? config.data : undefined,
      params: config.params,
    };

    logEvent(startEvent);
    return config;
  });

  axios.interceptors.response.use(
    (response: any) => {
      const duration = Math.round(performance.now() - response.config.metadata.startTime);
      
      const successEvent: RequestSuccessEvent = {
        event: 'request_success',
        requestId: response.config.metadata.requestId,
        timestamp: new Date().toISOString(),
        url: response.config.url,
        method: response.config.method?.toUpperCase() || 'GET',
        library: 'axios',
        environment: 'client',
        status: response.status,
        statusText: response.statusText,
        duration,
        responseHeaders: globalConfig.includeHeaders ? response.headers : undefined,
        responseBody: globalConfig.includeBody ? response.data : undefined,
      };

      logEvent(successEvent);
      return response;
    },
    (error: any) => {
      const config = error.config || {};
      const metadata = config.metadata || { requestId: 'unknown', startTime: Date.now() };
      const duration = Math.round(performance.now() - metadata.startTime);

      const errorEvent: RequestErrorEvent = {
        event: 'request_error',
        requestId: metadata.requestId,
        timestamp: new Date().toISOString(),
        url: config.url || 'unknown',
        method: config.method?.toUpperCase() || 'GET',
        library: 'axios',
        environment: 'client',
        error: error.message,
        duration,
        errorCode: error.response?.status,
        stack: error.stack,
      };

      logEvent(errorEvent);
      return Promise.reject(error);
    }
  );
};

// Default logger instance
export const universalLogger = createLogger();

// Legacy exports (maintaining compatibility with your existing code)
export default ensureLogger();
export { ensureLogger as pino };

/**
 * @param context.module - Required
 * @returns a logger or a silent logger if filtered out
 */
export const createChildLogger = (context: LoggerContext): ExtendedLogger => {
  // Only create child loggers on server-side
  if (!isServer()) {
    return ensureLogger(); // Return the fallback logger on client
  }

  if (isDev && !shouldLogModule(context.module)) {
    return createSilentLogger();
  }

  const base = {
    ...context,
    ...(context.filePath && {
      filePath: context.filePath.replace(process.cwd() + "/", ""),
    }),
    ...(!isDev && {
      environment: process.env.NODE_ENV || "production",
    }),
  };

  return ensureLogger().child(base);
};

const shouldLogModule = (module: string): boolean => {
  const allowed = process.env.LOG_MODULE?.split(",").map(m => m.trim());
  return !allowed || allowed.includes(module);
};

const createSilentLogger = (): ExtendedLogger =>
  ({
    info() {},
    warn() {},
    error() {},
    debug() {},
    trace() {},
    fatal() {},
    child: createSilentLogger,
  } as unknown as ExtendedLogger);

export async function measureDuration<T>(
  label: string,
  fn: () => Promise<T> | T,
  log: ExtendedLogger = ensureLogger()
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
  log: ExtendedLogger = ensureLogger()
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

// Auto-setup interceptors on client-side import
if (typeof window !== 'undefined') {
  setTimeout(() => setupInterceptors(), 0);
}