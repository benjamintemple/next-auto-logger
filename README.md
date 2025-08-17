# next-auto-logger

[![npm version](https://img.shields.io/npm/v/next-auto-logger)](https://www.npmjs.com/package/next-auto-logger)
[![npm downloads](https://img.shields.io/npm/dm/next-auto-logger)](https://www.npmjs.com/package/next-auto-logger)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/next-auto-logger)](https://bundlephobia.com/package/next-auto-logger)
[![Build Status](https://img.shields.io/github/actions/workflow/status/benjamintemple/next-auto-logger/ci.yml?branch=main)](https://github.com/benjamintemple/next-auto-logger/actions)

Instant, enterprise-grade logging for Next.js applications - built on [Pino](https://github.com/pinojs/pino).

## Features

- 🚀 **Zero-config setup** - Works out of the box with sensible defaults
- 🎯 **Performance monitoring** - Built-in duration measurement utilities
- 🔧 **Development-friendly** - Pretty logging in development, structured JSON in production
- 🎛️ **Module filtering** - Selectively enable logging for specific modules during development
- 📦 **Lightweight** - Minimal dependencies and optimized for performance
- 🛡️ **Type-safe** - Full TypeScript support with comprehensive type definitions

## Installation

```bash
npm install next-auto-logger
```

## Quick Start

```typescript
import { createChildLogger } from 'next-auto-logger'

// ✅ Recommended: Always use createChildLogger for proper context
const logger = createChildLogger({
  module: 'auth',
  component: 'LoginForm',
  filePath: __filename
})

logger.info('User login attempt', { userId: '123' })
```

> **💡 Best Practice**: Always use `createChildLogger()` instead of the default export. This provides proper context, module filtering, and better observability.

## API Reference

### createChildLogger(context) - Recommended

**This is the primary way to use next-auto-logger.** Creates a contextual child logger with additional metadata:

```typescript
import { createChildLogger } from 'next-auto-logger'

const logger = createChildLogger({
  module: 'user-service',        // Required: Module identifier
  component: 'UserRepository',   // Optional: Component name
  filePath: __filename,          // Optional: File path (auto-shortened)
  environment: 'staging'         // Optional: Environment override
})

logger.info('Info message')
logger.warn('Warning message') 
logger.error('Error message')
logger.debug('Debug message')
```

**Why use createChildLogger?**

- ✅ Provides structured context in all log entries
- ✅ Enables module-based filtering in development
- ✅ Better observability and debugging
- ✅ Consistent logging patterns across your application

### Default Logger (Not Recommended)

The package also exports a basic logger, but **you should prefer `createChildLogger()`**:

```typescript
import logger from 'next-auto-logger'  // ⚠️ Use createChildLogger() instead

logger.info('Basic message')  // Missing context and filtering capabilities
```

**Context Options:**

- `module` (string, required): Identifies the module/service
- `component` (string, optional): Specific component within the module
- `filePath` (string, optional): File path (automatically strips project root)
- `environment` (string, optional): Environment identifier

### Performance Monitoring

#### measureDuration(label, fn, logger)

Measures and logs function execution time:

```typescript
import { measureDuration } from 'next-auto-logger'

const result = await measureDuration(
  'database-query',
  async () => {
    return await db.users.findMany()
  },
  logger
)

// Logs: { durationMs: 45.23, label: 'database-query' } "database-query completed"
```

#### measureDurationQuiet(label, fn, logger)

Measures execution time and returns both result and duration:

```typescript
import { measureDurationQuiet } from 'next-auto-logger'

const { result, durationMs } = await measureDurationQuiet(
  'api-call',
  () => fetch('/api/users'),
  logger
)

console.log(`API call took ${durationMs}ms`)
```

## Environment Configuration

### LOG_LEVEL

Set the minimum log level (default: `info`):

```bash
LOG_LEVEL=debug npm run dev
```

Supported levels: `trace`, `debug`, `info`, `warn`, `error`, `fatal`

### NODE_ENV

- **Development**: Enables pretty printing with colors
- **Production**: Outputs structured JSON logs

### LOG_MODULE (Development Only)

Filter logs to specific modules during development:

```bash
# Only show logs from auth and payment modules
LOG_MODULE=auth,payment npm run dev
```

```typescript
// This will be silent in development (unless LOG_MODULE includes 'analytics')
const analyticsLogger = createChildLogger({ module: 'analytics' })
analyticsLogger.info('User clicked button') // Won't show

// This will always log
const authLogger = createChildLogger({ module: 'auth' })
authLogger.info('User logged in') // Will show if LOG_MODULE includes 'auth'
```

## Usage Examples

### Next.js API Route

```typescript
// pages/api/users.ts
import { createChildLogger, measureDuration } from 'next-auto-logger'

// ✅ Always create contextual loggers
const logger = createChildLogger({
  module: 'api',
  component: 'users',
  filePath: __filename
})

export default async function handler(req, res) {
  logger.info('Fetching users', { method: req.method })
  
  try {
    const users = await measureDuration(
      'fetch-users',
      () => db.user.findMany(),
      logger
    )
    
    res.json({ users })
  } catch (error) {
    logger.error({ error }, 'Failed to fetch users')
    res.status(500).json({ error: 'Internal server error' })
  }
}
```

### React Component (Client-side)

```typescript
// components/UserProfile.tsx
import { createChildLogger } from 'next-auto-logger'

const logger = createChildLogger({
  module: 'ui',
  component: 'UserProfile'
})

export function UserProfile({ userId }: { userId: string }) {
  useEffect(() => {
    logger.info('UserProfile mounted', { userId })
    
    return () => {
      logger.debug('UserProfile unmounted', { userId })
    }
  }, [userId])

  // Component implementation...
}
```

### Service Layer

```typescript
// services/auth.ts
import { createChildLogger, measureDurationQuiet } from 'next-auto-logger'

const logger = createChildLogger({
  module: 'auth-service',
  filePath: __filename
})

export class AuthService {
  async login(email: string, password: string) {
    const { result, durationMs } = await measureDurationQuiet(
      'user-authentication',
      () => this.validateCredentials(email, password),
      logger
    )
    
    if (durationMs > 1000) {
      logger.warn({ durationMs, email }, 'Slow authentication detected')
    }
    
    return result
  }
}
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build the package
npm run build

# Run tests in watch mode
npm run test:dev
```

## License

MIT © [Benjamin Temple](https://github.com/benjamintemple)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
