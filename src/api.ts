// Auto-generated API handlers for both Pages and App Router
import pino from 'pino';
import { NextApiRequest, NextApiResponse } from 'next';
import { NextRequest, NextResponse } from 'next/server';

// Override Pino's TypeScript definitions to match actual runtime behavior
declare module 'pino' {
  interface LogFn {
    (obj: object, msg?: string, ...args: any[]): void;
    (msg: string, ...args: any[]): void;
    (...args: any[]): void;
  }
}

// Create logger with same config as main logger
const createLogger = (): pino.Logger => {
  const isDev = process.env.NODE_ENV === 'development';
  
  return pino({
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
    formatters: {
      level: (label) => ({ level: label }),
      log: (obj) => ({
        ...obj,
        timestamp: new Date().toISOString(),
        environment: 'server',
      }),
    },
    ...(isDev && {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname,time',
          messageFormat: '{msg}',
          translateTime: 'HH:MM:ss Z',
        },
      },
    }),
    ...(!isDev && {
      redact: ['headers.authorization', 'headers.cookie', 'body.password'],
    }),
  });
};

const logger = createLogger();

const getClientIP = (req: NextApiRequest | NextRequest): string => {
  if ('connection' in req) {
    // NextApiRequest
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.connection?.remoteAddress ||
      '127.0.0.1'
    );
  } else {
    // NextRequest
    return (
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1'
    );
  }
};

const setCorsHeaders = (setHeader: (key: string, value: string) => void, origin?: string | null): void => {
  setHeader('Access-Control-Allow-Origin', origin || '*');
  setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

// Rate limiting (simple in-memory, use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const checkRateLimit = (ip: string, limit: number = 100): boolean => {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const record = rateLimitStore.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= limit) return false;
  record.count++;
  return true;
};

// Pages Router handler (default export)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS
  const origin = req.headers.origin;
  setCorsHeaders((k: string, v: string) => res.setHeader(k, v), origin);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const clientIP = getClientIP(req);
  if (!checkRateLimit(clientIP)) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  try {
    const logData = req.body;
    
    // Validate basic structure
    if (!logData.event || !logData.requestId || !logData.url) {
      return res.status(400).json({ error: 'Invalid log data structure' });
    }

    // Enrich with server-side data
    const enrichedLog = {
      ...logData,
      serverTimestamp: new Date().toISOString(),
      clientIP,
      userAgent: req.headers['user-agent'],
      referer: req.headers.referer,
      // Ensure environment is set to client for logs coming from client
      environment: 'client',
    };

    // Log with appropriate level
    const level = logData.event === 'request_error' ? 'error' : 'info';
    (logger as any)[level](enrichedLog);

    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error), 
      stack: error instanceof Error ? error.stack : undefined,
      clientIP: getClientIP(req),
    }, 'Failed to process client log');
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// App Router handlers (named exports)
export async function POST(req: NextRequest) {
  const corsHeaders: Record<string, string> = {};
  const origin = req.headers.get('origin');
  
  if (origin) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
  } else {
    corsHeaders['Access-Control-Allow-Origin'] = '*';
  }
  corsHeaders['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
  corsHeaders['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';

  // Rate limiting
  const clientIP = getClientIP(req);
  if (!checkRateLimit(clientIP)) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }

  try {
    const logData = await req.json();
    
    // Validate basic structure
    if (!logData.event || !logData.requestId || !logData.url) {
      return new Response(JSON.stringify({ error: 'Invalid log data structure' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    // Enrich with server-side data
    const enrichedLog = {
      ...logData,
      serverTimestamp: new Date().toISOString(),
      clientIP,
      userAgent: req.headers.get('user-agent'),
      referer: req.headers.get('referer'),
      // Ensure environment is set to client for logs coming from client
      environment: 'client',
    };

    // Log with appropriate level
    const level = logData.event === 'request_error' ? 'error' : 'info';
    (logger as any)[level](enrichedLog);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error), 
      stack: error instanceof Error ? error.stack : undefined,
      clientIP: getClientIP(req),
    }, 'Failed to process client log');
    
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
}

export async function OPTIONS(req: NextRequest) {
  const corsHeaders: Record<string, string> = {};
  const origin = req.headers.get('origin');
  
  if (origin) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
  } else {
    corsHeaders['Access-Control-Allow-Origin'] = '*';
  }
  corsHeaders['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
  corsHeaders['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';

  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}