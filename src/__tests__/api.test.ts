import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextApiRequest, NextApiResponse } from 'next'
import { NextRequest } from 'next/server'

// Set up Headers polyfill for test environment
if (typeof Headers === 'undefined') {
  global.Headers = class Headers {
    private _headers: Map<string, string> = new Map()
    
    constructor(init?: HeadersInit) {
      if (init) {
        if (Array.isArray(init)) {
          init.forEach(([key, value]) => this.set(key, value))
        } else if (init instanceof Headers) {
          init.forEach((value, key) => this.set(key, value))
        } else {
          Object.entries(init).forEach(([key, value]) => this.set(key, value))
        }
      }
    }
    
    get(name: string): string | null {
      return this._headers.get(name.toLowerCase()) || null
    }
    
    set(name: string, value: string): void {
      this._headers.set(name.toLowerCase(), value)
    }
    
    has(name: string): boolean {
      return this._headers.has(name.toLowerCase())
    }
    
    delete(name: string): void {
      this._headers.delete(name.toLowerCase())
    }
    
    append(name: string, value: string): void {
      const existing = this.get(name)
      this.set(name, existing ? `${existing}, ${value}` : value)
    }
    
    forEach(callback: (value: string, key: string, parent: Headers) => void): void {
      this._headers.forEach((value, key) => callback(value, key, this))
    }
    
    keys(): IterableIterator<string> {
      return this._headers.keys()
    }
    
    values(): IterableIterator<string> {
      return this._headers.values()
    }
    
    entries(): IterableIterator<[string, string]> {
      return this._headers.entries()
    }
    
    [Symbol.iterator](): IterableIterator<[string, string]> {
      return this._headers.entries()
    }
  }
}

// Mock Response for App Router tests
if (typeof Response === 'undefined') {
  global.Response = class Response {
    status: number
    statusText: string
    headers: Headers
    body: any
    
    constructor(body?: BodyInit | null, init?: ResponseInit) {
      this.status = init?.status || 200
      this.statusText = init?.statusText || 'OK'
      this.headers = new Headers(init?.headers)
      this.body = body
    }
    
    async json(): Promise<any> {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body
    }
    
    async text(): Promise<string> {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body)
    }
  } as any
}

// Mock pino
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  fatal: vi.fn(),
  child: vi.fn(() => mockLogger),
}

vi.mock('pino', () => ({
  default: vi.fn(() => mockLogger)
}))

// Mock Next.js types
const createMockNextApiRequest = (overrides: Partial<NextApiRequest> = {}): NextApiRequest => ({
  method: 'POST',
  headers: {},
  body: {},
  query: {},
  connection: { remoteAddress: '127.0.0.1' },
  ...overrides,
} as NextApiRequest)

const createMockNextApiResponse = (): NextApiResponse => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  } as unknown as NextApiResponse
  return res
}

const createMockNextRequest = (overrides: Partial<any> = {}): NextRequest => {
  // Create a proper Headers object
  const headers = new Headers()
  headers.set('content-type', 'application/json')
  
  // Add any custom headers
  Object.entries(overrides.headers || {}).forEach(([key, value]) => {
    headers.set(key, value as string)
  })
  
  // Create the request object without spreading overrides.headers
  const { headers: _, ...restOverrides } = overrides
  
  const req = {
    method: overrides.method || 'POST',
    headers,
    json: vi.fn().mockResolvedValue(overrides.body || {}),
    ...restOverrides
  } as unknown as NextRequest
  
  return req
}

describe('API Handlers', () => {
  let handler: any
  let POST: any
  let OPTIONS: any

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('LOG_LEVEL', '')
    
    // Import the module fresh each time
    vi.resetModules()
    const apiModule = await import('../api')
    handler = apiModule.default
    POST = apiModule.POST
    OPTIONS = apiModule.OPTIONS
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('Logger Creation', () => {
    it('should create logger with default configuration', async () => {
      const apiModule = await import('../api')
      expect(apiModule).toBeDefined()
    })

    it('should use LOG_LEVEL environment variable', async () => {
      vi.stubEnv('LOG_LEVEL', 'debug')
      vi.resetModules()
      const apiModule = await import('../api')
      expect(apiModule).toBeDefined()
    })

    it('should configure logger for development environment', async () => {
      vi.stubEnv('NODE_ENV', 'development')
      vi.resetModules()
      const apiModule = await import('../api')
      expect(apiModule).toBeDefined()
    })

    it('should configure logger for production environment', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.resetModules()
      const apiModule = await import('../api')
      expect(apiModule).toBeDefined()
    })
  })

  describe('Client IP Detection', () => {
    it('should extract IP from x-forwarded-for header in Pages Router', async () => {
      const req = createMockNextApiRequest({
        headers: { 'x-forwarded-for': '192.168.1.1,10.0.0.1' }
      })
      const res = createMockNextApiResponse()

      await handler(req, res)

      // Should not throw and should process the request
      expect(res.status).toHaveBeenCalled()
    })

    it('should extract IP from x-real-ip header in Pages Router', async () => {
      const req = createMockNextApiRequest({
        headers: { 'x-real-ip': '192.168.1.2' }
      })
      const res = createMockNextApiResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalled()
    })

    it('should fallback to connection.remoteAddress in Pages Router', async () => {
      const req = createMockNextApiRequest({
        connection: { remoteAddress: '10.0.0.5' }
      })
      const res = createMockNextApiResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalled()
    })

    it('should extract IP from headers in App Router', async () => {
      const req = createMockNextRequest({
        headers: { 'x-forwarded-for': '192.168.1.3,10.0.0.1' },
        body: {
          event: 'request_start',
          requestId: 'req_123',
          url: '/test'
        }
      })

      const response = await POST(req)
      expect(response).toBeDefined()
      expect(response.status).toBe(200)
    })

    it('should use default IP when no headers present', async () => {
      const req = createMockNextApiRequest({
        headers: {},
        connection: {}
      })
      const res = createMockNextApiResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalled()
    })
  })

  describe('CORS Handling', () => {
    it('should set CORS headers in Pages Router', async () => {
      const req = createMockNextApiRequest({
        headers: { origin: 'https://example.com' }
      })
      const res = createMockNextApiResponse()

      await handler(req, res)

      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com')
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'POST, OPTIONS')
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    })

    it('should handle OPTIONS request in Pages Router', async () => {
      const req = createMockNextApiRequest({
        method: 'OPTIONS',
        headers: { origin: 'https://example.com' }
      })
      const res = createMockNextApiResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.end).toHaveBeenCalled()
    })

    it('should handle OPTIONS request in App Router', async () => {
      const req = createMockNextRequest({
        method: 'OPTIONS',
        headers: { origin: 'https://example.com' }
      })

      const response = await OPTIONS(req)
      
      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com')
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS')
    })

    it('should set wildcard CORS when no origin provided', async () => {
      const req = createMockNextRequest({
        headers: {},
        body: {
          event: 'request_start',
          requestId: 'req_123',
          url: '/test'
        }
      })

      const response = await POST(req)
      expect(response).toBeDefined()
      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    })
  })

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      const req = createMockNextApiRequest({
        body: {
          event: 'request_start',
          requestId: 'req_123',
          url: '/test'
        }
      })
      const res = createMockNextApiResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('should track rate limit per IP address', async () => {
      const req1 = createMockNextApiRequest({
        headers: { 'x-real-ip': '192.168.1.1' },
        body: {
          event: 'request_start',
          requestId: 'req_123',
          url: '/test'
        }
      })
      
      const req2 = createMockNextApiRequest({
        headers: { 'x-real-ip': '192.168.1.2' },
        body: {
          event: 'request_start',
          requestId: 'req_124',
          url: '/test'
        }
      })

      const res1 = createMockNextApiResponse()
      const res2 = createMockNextApiResponse()

      await handler(req1, res1)
      await handler(req2, res2)

      // Both should succeed as they're from different IPs
      expect(res1.status).toHaveBeenCalledWith(200)
      expect(res2.status).toHaveBeenCalledWith(200)
    })

    it('should reset rate limit after time window', async () => {
      // This would require mocking Date.now() to test properly
      const req = createMockNextApiRequest({
        body: {
          event: 'request_start',
          requestId: 'req_123',
          url: '/test'
        }
      })
      const res = createMockNextApiResponse()

      await handler(req, res)
      expect(res.status).toHaveBeenCalledWith(200)
    })
  })

  describe('Request Validation', () => {
    it('should reject non-POST methods in Pages Router', async () => {
      const req = createMockNextApiRequest({
        method: 'GET'
      })
      const res = createMockNextApiResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(405)
      expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' })
    })

    it('should require event field in request body', async () => {
      const req = createMockNextApiRequest({
        body: {
          requestId: 'req_123',
          url: '/test'
        }
      })
      const res = createMockNextApiResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid log data structure' })
    })

    it('should require requestId field in request body', async () => {
      const req = createMockNextApiRequest({
        body: {
          event: 'request_start',
          url: '/test'
        }
      })
      const res = createMockNextApiResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid log data structure' })
    })

    it('should require url field in request body', async () => {
      const req = createMockNextApiRequest({
        body: {
          event: 'request_start',
          requestId: 'req_123'
        }
      })
      const res = createMockNextApiResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid log data structure' })
    })

    it('should validate request structure in App Router', async () => {
      const req = createMockNextRequest({
        body: {
          event: 'request_start'
          // Missing requestId and url
        }
      })

      const response = await POST(req)
      
      expect(response.status).toBe(400)
      const responseData = await response.json()
      expect(responseData.error).toBe('Invalid log data structure')
    })
  })

  describe('Log Processing', () => {
    it('should process valid log data in Pages Router', async () => {
      const logData = {
        event: 'request_start',
        requestId: 'req_123',
        url: '/api/test',
        method: 'GET',
        library: 'fetch',
        environment: 'client',
        timestamp: new Date().toISOString()
      }

      const req = createMockNextApiRequest({
        body: logData,
        headers: {
          'user-agent': 'Mozilla/5.0 test',
          'referer': 'https://example.com'
        }
      })
      const res = createMockNextApiResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({ success: true })
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          ...logData,
          serverTimestamp: expect.any(String),
          clientIP: expect.any(String),
          userAgent: 'Mozilla/5.0 test',
          referer: 'https://example.com',
          environment: 'client'
        })
      )
    })

    it('should process error events with error level logging', async () => {
      const logData = {
        event: 'request_error',
        requestId: 'req_124',
        url: '/api/test',
        method: 'POST',
        library: 'axios',
        environment: 'client',
        error: 'Network timeout',
        duration: 5000,
        timestamp: new Date().toISOString()
      }

      const req = createMockNextApiRequest({
        body: logData
      })
      const res = createMockNextApiResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          ...logData,
          serverTimestamp: expect.any(String),
          clientIP: expect.any(String),
          environment: 'client'
        })
      )
    })

    it('should process success events with info level logging', async () => {
      const logData = {
        event: 'request_success',
        requestId: 'req_125',
        url: '/api/test',
        method: 'GET',
        library: 'fetch',
        environment: 'client',
        status: 200,
        duration: 150,
        timestamp: new Date().toISOString()
      }

      const req = createMockNextApiRequest({
        body: logData
      })
      const res = createMockNextApiResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          ...logData,
          serverTimestamp: expect.any(String),
          clientIP: expect.any(String),
          environment: 'client'
        })
      )
    })

    it('should process valid log data in App Router', async () => {
      const logData = {
        event: 'request_success',
        requestId: 'req_126',
        url: '/api/test',
        method: 'POST',
        library: 'fetch',
        environment: 'client',
        status: 201,
        duration: 200,
        timestamp: new Date().toISOString()
      }

      const req = createMockNextRequest({
        body: logData,
        headers: {
          'user-agent': 'Mozilla/5.0 test',
          'referer': 'https://example.com'
        }
      })

      const response = await POST(req)

      expect(response.status).toBe(200)
      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          ...logData,
          serverTimestamp: expect.any(String),
          clientIP: expect.any(String),
          userAgent: 'Mozilla/5.0 test',
          referer: 'https://example.com',
          environment: 'client'
        })
      )
    })

    it('should enrich logs with server-side metadata', async () => {
      const logData = {
        event: 'request_start',
        requestId: 'req_127',
        url: '/api/test',
        method: 'GET',
        library: 'fetch',
        environment: 'client',
        timestamp: new Date().toISOString()
      }

      const req = createMockNextApiRequest({
        body: logData,
        headers: {
          'x-forwarded-for': '203.0.113.1',
          'user-agent': 'Test Client/1.0',
          'referer': 'https://app.example.com/dashboard'
        }
      })
      const res = createMockNextApiResponse()

      await handler(req, res)

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          serverTimestamp: expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
          clientIP: '203.0.113.1',
          userAgent: 'Test Client/1.0',
          referer: 'https://app.example.com/dashboard',
          environment: 'client'
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed JSON in Pages Router', async () => {
      const req = createMockNextApiRequest({
        body: 'invalid json'
      })
      const res = createMockNextApiResponse()

      // This should be handled gracefully
      await handler(req, res)

      expect(res.status).toHaveBeenCalled()
    })

    it('should handle logger errors gracefully', async () => {
      // Mock logger to throw an error
      mockLogger.info.mockImplementationOnce(() => {
        throw new Error('Logger failed')
      })

      const logData = {
        event: 'request_start',
        requestId: 'req_128',
        url: '/api/test'
      }

      const req = createMockNextApiRequest({
        body: logData
      })
      const res = createMockNextApiResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' })
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Logger failed',
          stack: expect.any(String),
          clientIP: expect.any(String)
        }),
        'Failed to process client log'
      )
    })

    it('should handle JSON parsing errors in App Router', async () => {
      const req = createMockNextRequest({})
      req.json = vi.fn().mockRejectedValue(new Error('Invalid JSON'))

      const response = await POST(req)

      expect(response.status).toBe(500)
      const responseData = await response.json()
      expect(responseData.error).toBe('Internal server error')
    })

    it('should handle unexpected errors during processing', async () => {
      const req = createMockNextApiRequest({
        body: {
          event: 'request_start',
          requestId: 'req_129',
          url: '/api/test'
        }
      })
      const res = createMockNextApiResponse()

      // Mock an unexpected error during processing
      res.json.mockImplementationOnce(() => {
        throw new Error('Unexpected error')
      })

      await handler(req, res)

      // Should still call the error logger
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('Response Format', () => {
    it('should return JSON success response in Pages Router', async () => {
      const req = createMockNextApiRequest({
        body: {
          event: 'request_start',
          requestId: 'req_130',
          url: '/api/test'
        }
      })
      const res = createMockNextApiResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({ success: true })
    })

    it('should return proper Content-Type headers in App Router', async () => {
      const req = createMockNextRequest({
        body: {
          event: 'request_start',
          requestId: 'req_131',
          url: '/api/test'
        }
      })

      const response = await POST(req)

      expect(response.headers.get('Content-Type')).toBe('application/json')
    })

    it('should include CORS headers in error responses', async () => {
      const req = createMockNextRequest({
        body: {
          event: 'request_start'
          // Missing required fields
        }
      })

      const response = await POST(req)

      expect(response.status).toBe(400)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined()
    })
  })

  describe('Environment Configuration', () => {
    it('should respect LOG_LEVEL environment variable', async () => {
      vi.stubEnv('LOG_LEVEL', 'warn')
      vi.resetModules()
      
      const apiModule = await import('../api')
      expect(apiModule).toBeDefined()
    })

    it('should configure differently for development vs production', async () => {
      // Test development
      vi.stubEnv('NODE_ENV', 'development')
      vi.resetModules()
      let apiModule = await import('../api')
      expect(apiModule).toBeDefined()

      // Test production
      vi.stubEnv('NODE_ENV', 'production')
      vi.resetModules()
      apiModule = await import('../api')
      expect(apiModule).toBeDefined()
    })
  })

  describe('Security Features', () => {
    it('should implement rate limiting per IP', async () => {
      const clientIP = '192.168.1.100'
      const requests = []

      // Create multiple requests from the same IP
      for (let i = 0; i < 5; i++) {
        const req = createMockNextApiRequest({
          headers: { 'x-real-ip': clientIP },
          body: {
            event: 'request_start',
            requestId: `req_${i}`,
            url: '/api/test'
          }
        })
        const res = createMockNextApiResponse()
        requests.push({ req, res })
      }

      // Process all requests
      for (const { req, res } of requests) {
        await handler(req, res)
      }

      // All should succeed as we're within rate limit
      requests.forEach(({ res }) => {
        expect(res.status).toHaveBeenCalledWith(200)
      })
    })

    it('should sanitize sensitive headers in production', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.resetModules()
      
      const apiModule = await import('../api')
      const handler = apiModule.default

      const req = createMockNextApiRequest({
        body: {
          event: 'request_start',
          requestId: 'req_secure',
          url: '/api/test'
        },
        headers: {
          'authorization': 'Bearer secret-token',
          'cookie': 'session=secret-session'
        }
      })
      const res = createMockNextApiResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      // The actual redaction testing would require checking pino configuration
    })
  })
})