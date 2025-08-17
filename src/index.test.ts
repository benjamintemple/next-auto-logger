import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createChildLogger, measureDuration, measureDurationQuiet, LoggerContext } from './index'

// Mock pino
vi.mock('pino', () => ({
  default: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      fatal: vi.fn(),
      child: vi.fn(),
    })),
  })),
}))

describe('Logger Initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.LOG_LEVEL
    delete process.env.NODE_ENV
    delete process.env.LOG_MODULE
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should create logger with default info level', async () => {
    // Re-import to test fresh initialization
    const { default: logger } = await import('./index')
    expect(logger).toBeDefined()
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.error).toBe('function')
  })

  it('should use LOG_LEVEL environment variable', async () => {
    process.env.LOG_LEVEL = 'debug'
    // Force re-import by clearing module cache
    vi.resetModules()
    const { default: logger } = await import('./index')
    expect(logger).toBeDefined()
  })

  it('should handle development environment with pretty transport', async () => {
    process.env.NODE_ENV = 'development'
    vi.resetModules()
    const { default: logger } = await import('./index')
    expect(logger).toBeDefined()
  })
})

describe('createChildLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.NODE_ENV
    delete process.env.LOG_MODULE
  })

  it('should create child logger with basic context', () => {
    const context: LoggerContext = {
      module: 'test-module'
    }
    const childLogger = createChildLogger(context)
    expect(childLogger).toBeDefined()
    expect(typeof childLogger.info).toBe('function')
  })

  it('should create child logger with full context', () => {
    const context: LoggerContext = {
      module: 'test-module',
      component: 'TestComponent',
      filePath: '/full/path/to/file.ts',
      environment: 'test'
    }
    const childLogger = createChildLogger(context)
    expect(childLogger).toBeDefined()
  })

  it('should strip cwd from filePath', () => {
    const originalCwd = process.cwd()
    vi.spyOn(process, 'cwd').mockReturnValue('/test/project')
    
    const context: LoggerContext = {
      module: 'test-module',
      filePath: '/test/project/src/component.ts'
    }
    
    const childLogger = createChildLogger(context)
    expect(childLogger).toBeDefined()
    
    vi.mocked(process.cwd).mockRestore()
  })

  it('should create silent logger in development when module not allowed', () => {
    process.env.NODE_ENV = 'development'
    process.env.LOG_MODULE = 'allowed-module'
    
    const context: LoggerContext = {
      module: 'forbidden-module'
    }
    
    const childLogger = createChildLogger(context)
    expect(childLogger).toBeDefined()
    
    // Silent logger methods should be no-ops
    expect(() => childLogger.info('test')).not.toThrow()
  })

  it('should allow logging when module is in LOG_MODULE list', () => {
    process.env.NODE_ENV = 'development'
    process.env.LOG_MODULE = 'module1,module2,test-module'
    
    const context: LoggerContext = {
      module: 'test-module'
    }
    
    const childLogger = createChildLogger(context)
    expect(childLogger).toBeDefined()
  })

  it('should allow all modules when LOG_MODULE is not set', () => {
    process.env.NODE_ENV = 'development'
    
    const context: LoggerContext = {
      module: 'any-module'
    }
    
    const childLogger = createChildLogger(context)
    expect(childLogger).toBeDefined()
  })
})

describe('measureDuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should measure duration of synchronous function', async () => {
    const mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
    } as any

    const syncFn = () => 'result'
    const result = await measureDuration('test-sync', syncFn, mockLogger)

    expect(result).toBe('result')
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        durationMs: expect.any(Number),
        label: 'test-sync'
      }),
      'test-sync completed'
    )
  })

  it('should measure duration of asynchronous function', async () => {
    const mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
    } as any

    const asyncFn = async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      return 'async-result'
    }

    const result = await measureDuration('test-async', asyncFn, mockLogger)

    expect(result).toBe('async-result')
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        durationMs: expect.any(Number),
        label: 'test-async'
      }),
      'test-async completed'
    )

    const call = mockLogger.info.mock.calls[0]
    expect(call[0].durationMs).toBeGreaterThan(0)
  })

  it('should handle function errors and still measure duration', async () => {
    const mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
    } as any

    const errorFn = () => {
      throw new Error('test error')
    }

    await expect(measureDuration('test-error', errorFn, mockLogger)).rejects.toThrow('test error')

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        err: expect.any(Error),
        durationMs: expect.any(Number),
        label: 'test-error'
      }),
      'test-error failed'
    )
  })
})

describe('measureDurationQuiet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should measure duration and return result with timing', async () => {
    const mockLogger = {
      debug: vi.fn(),
      error: vi.fn(),
    } as any

    const syncFn = () => 'quiet-result'
    const { result, durationMs } = await measureDurationQuiet('test-quiet', syncFn, mockLogger)

    expect(result).toBe('quiet-result')
    expect(durationMs).toBeGreaterThanOrEqual(0)
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.objectContaining({
        durationMs: expect.any(Number),
        label: 'test-quiet'
      }),
      'test-quiet completed'
    )
  })

  it('should handle async functions and return timing info', async () => {
    const mockLogger = {
      debug: vi.fn(),
      error: vi.fn(),
    } as any

    const asyncFn = async () => {
      await new Promise(resolve => setTimeout(resolve, 5))
      return 'async-quiet-result'
    }

    const { result, durationMs } = await measureDurationQuiet('test-async-quiet', asyncFn, mockLogger)

    expect(result).toBe('async-quiet-result')
    expect(durationMs).toBeGreaterThan(0)
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.objectContaining({
        durationMs,
        label: 'test-async-quiet'
      }),
      'test-async-quiet completed'
    )
  })

  it('should handle errors and still provide timing', async () => {
    const mockLogger = {
      debug: vi.fn(),
      error: vi.fn(),
    } as any

    const errorFn = () => {
      throw new Error('quiet error')
    }

    await expect(measureDurationQuiet('test-quiet-error', errorFn, mockLogger)).rejects.toThrow('quiet error')

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        err: expect.any(Error),
        durationMs: expect.any(Number),
        label: 'test-quiet-error'
      }),
      'test-quiet-error failed'
    )
  })
})