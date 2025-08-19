# next-auto-logger

**The first logging solution designed specifically for Next.js + AWS CloudWatch** - JSON logs everywhere for reliability, with optional pretty logging via external piping. Works seamlessly across client/server boundaries and makes CloudWatch feel like magic instead of a nightmare.

## 🚀 Quick Start

### **⚡ Get logging in 2 minutes**

This section gets you up and running immediately. Jump to "Getting Started" below for detailed setup.

```bash
# Quick setup with CLI (automatically installs all dependencies)
npx next-auto-logger init

# Add to any component
import { createChildLogger } from 'next-auto-logger';
const logger = createChildLogger({ module: 'Test' });
logger.info('Hello from next-auto-logger!');
```

**See it work in CloudWatch (5 minutes):**

1. Deploy to your AWS environment
2. Open CloudWatch Logs Insights
3. Run this query:

```sql
fields @timestamp, module, msg
| filter module = "Test"
| sort @timestamp desc
```

4. Be amazed that it actually works

## 📚 Getting Started

### 🔥 The Problem This Solves

#### Before: The Next.js + AWS Logging Nightmare

You've been there. We all have:

```typescript
// Client side
console.log("User clicked button"); // Lost forever, never reaches CloudWatch

// Server side
console.log("API called"); // Shows up in CloudWatch as unstructured mess

// Different environments
console.log("Dev logs"); // Pretty in terminal
console.log("Prod logs"); // Ugly JSON blob in CloudWatch

// Trying to correlate client + server
console.log("Client: started request"); // In browser only
console.log("Server: processing"); // In CloudWatch only
// No way to connect them!
```

**Result:** Hours wasted digging through logs, no way to debug client issues in production, AWS CloudWatch feels like punishment.

#### After: next-auto-logger

```typescript
import { createChildLogger } from "next-auto-logger";

const logger = createChildLogger({ module: "UserFlow" });

// Works EVERYWHERE - client, server, API routes, middleware
logger.info("User started checkout", { userId: 123, cartValue: 89.99 });

// Automatically:
// ✅ Structured JSON logs everywhere for reliability
// ✅ Client logs reach CloudWatch via your API
// ✅ Optional pretty logs via npm run dev:pretty
// ✅ Searchable, queryable, actually useful
```

**The difference is night and day.**

---

### 🚀 30-Second Setup (Seriously)

#### 1. Quick Setup with CLI (Recommended)

```bash
# Initialize next-auto-logger in your project
npx next-auto-logger init

# The CLI will automatically:
# ✅ Install next-auto-logger and pino
# ✅ Detect your package manager (npm/yarn/pnpm)
# ✅ Choose your router (App Router/Pages Router)
# ✅ Set up API endpoints automatically
# ✅ Configure logging options
# ✅ Optionally set up pretty logging (npm run dev:pretty)
```

**The CLI handles everything** - no need to manually install packages or create files. Just run the command and you're ready to log!

#### 2. Start logging anywhere

```typescript
import { createChildLogger } from "next-auto-logger";

const logger = createChildLogger({ module: "Auth" });

export default function LoginPage() {
  const handleLogin = async () => {
    logger.info("Login attempt started");

    try {
      const user = await signIn(credentials);
      logger.info("Login successful", {
        userId: user.id,
        loginMethod: "email",
      });
    } catch (error) {
      logger.error("Login failed", {
        error: error.message,
        email: credentials.email,
      });
    }
  };

  return <button onClick={handleLogin}>Login</button>;
}
```

#### 3. Deploy to AWS and search your logs like a database

```sql
-- Find all login failures in CloudWatch
fields @timestamp, module, msg, error, email
| filter level = "error" and module = "Auth"
| sort @timestamp desc
```

**That's it.** You now have the logging setup that used to take weeks to configure properly.

---

### 🎯 Why This Changes Everything for Next.js + AWS

#### Problem 1: Client-side logs disappear in production

**Traditional approach:** Client logs stay in browser, never reach CloudWatch
**next-auto-logger:** Client logs automatically sent to your API, then to CloudWatch

#### Problem 2: Different log formats everywhere

**Traditional approach:** console.log in dev, JSON.stringify in prod, manual formatting
**next-auto-logger:** Structured JSON everywhere for reliability, optional pretty logs via external piping

#### Problem 3: No request correlation between client/server

**Traditional approach:** Impossible to trace a user action from client through to API
**next-auto-logger:** Automatic request IDs, full correlation across your entire stack

#### Problem 4: CloudWatch is impossible to query

**Traditional approach:** Searching logs like "user login error" in CloudWatch = nightmare
**next-auto-logger:** Every log is structured, searchable, queryable like a database

#### Problem 5: Different configuration for every environment

**Traditional approach:** Complex Pino config, different transports, manual setup
**next-auto-logger:** Works perfectly everywhere with zero configuration

---

### 📊 See The Difference: Before vs After

#### Your Current CloudWatch Experience 😵

```text
2025-01-15T10:30:45.123Z undefined INFO something happened
2025-01-15T10:30:46.234Z undefined ERROR [object Object]
2025-01-15T10:30:47.345Z undefined INFO user did a thing
```

**Searching this is impossible. You can't filter, can't group, can't understand anything.**

#### With next-auto-logger 🎉

```json
{
  "level": "info",
  "time": "2025-01-15T10:30:45.123Z",
  "module": "UserAuth",
  "msg": "Login attempt started",
  "userId": "user_123",
  "email": "user@example.com",
  "requestId": "req_abc123"
}
```

**Now you can search, filter, group, and actually debug your application.**

#### CloudWatch Insights Becomes Powerful

```sql
-- Find all errors for a specific user
fields @timestamp, module, msg, error
| filter userId = "user_123" and level = "error"
| sort @timestamp desc

-- Monitor API performance
fields @timestamp, module, msg, duration
| filter module like /API/
| stats avg(duration), max(duration) by msg

-- Track feature usage
fields @timestamp, module, msg, feature
| filter msg like /feature_used/
| stats count() by feature, module
```

**These queries actually work and give you real insights.**

---

### 🛠️ CLI Setup Tool

The `next-auto-logger` CLI makes setup effortless with an interactive wizard:

#### CLI Commands

```bash
# Initialize next-auto-logger in your project
npx next-auto-logger init

# Or if installed globally
npm install -g next-auto-logger
next-auto-logger init
```

#### What the CLI Does

The interactive setup wizard will:

1. **Install missing packages** - Automatically detects and installs required dependencies:
   - `next-auto-logger` - The main logging library
   - `pino` - High-performance JSON logger
2. **Detect package manager** - Works with npm, yarn, or pnpm automatically
3. **Detect your Next.js setup** - Automatically identifies App Router vs Pages Router
4. **Create API endpoints** - Generates the correct API handler for your router type
5. **Configure options** - Interactive prompts for:
   - API endpoint path (default: `/api/logs`)
   - Enable automatic request interceptors
   - Include request/response headers in logs
   - Include request/response bodies in logs
   - Set default log level for production
   - Create example usage file
6. **Environment setup** - Creates `.env.local` with optimal settings
7. **Pretty logging setup** - Optionally installs pino-pretty and adds `dev:pretty` script to package.json

#### CLI Output Example

```bash
$ npx next-auto-logger init

🚀 Welcome to next-auto-logger setup!

📦 Detected package manager: npm

⚠️  Missing required packages: next-auto-logger, pino
🔍 These packages are required for next-auto-logger to work properly:

   • next-auto-logger - The main logging library
   • pino - High-performance JSON logger

? Install missing packages using npm? Yes

📦 Installing packages: next-auto-logger pino
   Running: npm install next-auto-logger pino
✅ Packages installed successfully

? Which Next.js router are you using? App Router (Next.js 13+) - Recommended
? API endpoint path for client logs: /api/logs
? Enable automatic request interceptors? Yes
? Include request/response headers in logs? No
? Include request/response bodies in logs? No
? Default log level for production: info - Standard logging (recommended)
? Create example usage file? Yes

📁 Creating files...

✅ Created app/api/logs/route.ts
✅ Created logger-example.ts
✅ Created .env.local

🎉 next-auto-logger setup complete!

📋 What was configured:
   ✓ App Router API handler
   ✓ API endpoint: /api/logs
   ✓ Auto interceptors: Enabled
   ✓ Log level: info

🚀 Next steps:
   ✓ All required packages are installed
   ✓ API endpoint configured
   ✓ Environment variables set

   1. Add this to your app/layout.tsx:
      import { createLogger } from 'next-auto-logger';
      const logger = createLogger({ autoSetupInterceptors: true });

   2. Start using the logger:
      import { createChildLogger } from "next-auto-logger";
      const logger = createChildLogger({ module: "MyModule" });
      logger.info("Hello world!", { userId: "123" });

   3. Check out logger-example.ts for more examples

   4. Deploy and view logs in AWS CloudWatch Insights

Happy logging! 🎉
```

#### 🎨 Pretty Logging for Development

next-auto-logger outputs JSON logs everywhere for reliability and CloudWatch compatibility. For beautiful development logs, use external piping:

```bash
# Option 1: Use the dev:pretty script (added by CLI)
npm run dev:pretty
# or
yarn dev:pretty

# Option 2: Manual piping
npm run dev | npx pino-pretty
```

**Why JSON everywhere?**
- ✅ **Reliable** - No worker thread crashes or compatibility issues
- ✅ **CloudWatch optimized** - Perfect structured logs for production
- ✅ **Consistent** - Same format in all environments
- ✅ **External pretty** - Beautiful logs when you want them via piping

---

### 🔧 Level 2: The Magic of Auto HTTP Logging

Ready for the real magic? Let's add automatic request logging:

#### Setup (2 minutes)

##### Option A: Use the CLI (Recommended)

```bash
npx next-auto-logger init
# Choose "Enable automatic request interceptors" when prompted
```

##### Option B: Manual Setup (if you prefer not to use the CLI)

```bash
# First install packages manually
npm install next-auto-logger pino

# Optional: for pretty logging during development
npm install pino-pretty
```

```typescript
// 1. Add this to your app/layout.tsx (App Router) or pages/_app.tsx (Pages Router)
import { createLogger } from "next-auto-logger";

// Create logger with auto interceptors enabled
const logger = createLogger({ autoSetupInterceptors: true });

// 2. Create API endpoint:
// For App Router: app/api/logs/route.ts
export { POST, OPTIONS } from "next-auto-logger/api";

// For Pages Router: pages/api/logs.ts
export { default } from "next-auto-logger/api";
```

#### What You Get Automatically

Every HTTP request in your app now logs automatically:

```typescript
// This code doesn't change
const response = await fetch("/api/users");
const data = await response.json();

// But now you get these logs automatically:
// [INFO] request_start: GET /api/users (fetch)
// [INFO] request_success: GET /api/users → 200 (234ms)
```

**In CloudWatch:**

```sql
-- Find slow API calls across your entire app
fields @timestamp, url, method, duration, status
| filter duration > 1000
| sort duration desc

-- API error rate by endpoint
fields @timestamp, url, status
| filter status >= 400
| stats count() by url
| sort count desc

-- Client vs server performance comparison
fields @timestamp, url, duration, environment
| filter url = "/api/users"
| stats avg(duration) by environment
```

#### Works With Everything

- ✅ Native `fetch()`
- ✅ Axios
- ✅ React Query / TanStack Query
- ✅ SWR
- ✅ Any HTTP library

**All automatically logged with timing, status codes, errors, and correlation IDs.**

---

### 🚀 Level 3: Production Debugging Stories

#### Story 1: "App is slow but I don't know where"

**Before next-auto-logger:** Add console.logs everywhere, redeploy, hope for the best, remove logs, repeat.

**With next-auto-logger:**

```sql
-- Find the slowest operations
fields @timestamp, module, msg, durationMs
| filter durationMs > 2000
| sort durationMs desc
| limit 20
```

**Result in 30 seconds:** Database queries in `UserService` taking 5+ seconds. Fixed by adding an index.

#### Story 2: "Users can't log in on mobile"

**Before:** Can't see client-side errors, no mobile-specific logs, guessing game.

**With next-auto-logger:**

```sql
-- Check mobile-specific auth errors
fields @timestamp, module, msg, error, userAgent
| filter module = "Auth" and level = "error"
| filter userAgent like /Mobile|iPhone|Android/
| sort @timestamp desc
```

**Result:** Found iOS Safari cookie issue in 5 minutes instead of days.

#### Story 3: "Payment failures spiking"

**Before:** Dig through server logs, try to correlate with client behavior, manual detective work.

**With next-auto-logger:**

```sql
-- Full payment flow analysis
fields @timestamp, module, msg, orderId, amount, error
| filter orderId = "order_abc123"
| sort @timestamp asc
```

**Result:** Complete timeline from client button click to server error to payment provider response. Found the issue immediately.

---

### 💡 Level 4: AWS CloudWatch Pro Tips

#### Setup CloudWatch Dashboard (5 minutes)

Create custom metrics from your structured logs:

```typescript
// CloudFormation template
Resources:
  ErrorRateMetric:
    Type: AWS::Logs::MetricFilter
    Properties:
      LogGroupName: !Ref LogGroup
      FilterPattern: '{ $.level = "error" }'
      MetricTransformations:
        - MetricNamespace: "NextJS/MyApp"
          MetricName: "ErrorCount"
          MetricValue: "1"

  SlowRequestMetric:
    Type: AWS::Logs::MetricFilter
    Properties:
      LogGroupName: !Ref LogGroup
      FilterPattern: '{ $.duration > 2000 }'
      MetricTransformations:
        - MetricNamespace: "NextJS/MyApp"
          MetricName: "SlowRequests"
          MetricValue: "$.duration"
```

#### Essential CloudWatch Queries

```sql
-- Overall app health
fields @timestamp, level, module, msg
| stats count() by level
| sort level

-- User journey tracking
fields @timestamp, module, msg, userId, requestId
| filter userId = "user_123"
| sort @timestamp asc

-- Performance by feature
fields @timestamp, module, msg, duration
| filter duration > 0
| stats avg(duration), max(duration), count() by module
| sort avg(duration) desc

-- Error investigation
fields @timestamp, module, msg, error, stack, url
| filter level = "error"
| sort @timestamp desc
| limit 100

-- API endpoint analysis
fields @timestamp, url, method, status, duration
| filter url like /\/api\//
| stats count(), avg(duration) by url, method
| sort count desc
```

#### Alerting Setup

```typescript
// CloudWatch Alarm for error rate
Resources:
  HighErrorRateAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: "NextJS-High-Error-Rate"
      MetricName: "ErrorCount"
      Namespace: "NextJS/MyApp"
      Statistic: "Sum"
      Period: 300
      EvaluationPeriods: 2
      Threshold: 10
      ComparisonOperator: "GreaterThanThreshold"
      AlarmActions:
        - !Ref SNSTopic
```

---

### 🔧 Level 5: Advanced Next.js Patterns

#### API Routes with Context

```typescript
// app/api/users/[id]/route.ts
import { createChildLogger } from "next-auto-logger";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const logger = createChildLogger({
    module: "UserAPI",
    userId: params.id,
    requestId: request.headers.get("x-request-id") || crypto.randomUUID(),
  });

  logger.info("API request started", {
    method: request.method,
    userAgent: request.headers.get("user-agent"),
    ip: request.headers.get("x-forwarded-for"),
  });

  try {
    const user = await getUser(params.id);
    logger.info("User fetched successfully", { email: user.email });
    return NextResponse.json(user);
  } catch (error) {
    logger.error("Failed to fetch user", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

#### Middleware Logging

```typescript
// middleware.ts
import { createChildLogger } from "next-auto-logger";
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const logger = createChildLogger({ module: "Middleware" });

  logger.info("Request intercepted", {
    url: request.url,
    method: request.method,
    country: request.geo?.country,
    userAgent: request.headers.get("user-agent"),
  });

  // Add request ID to headers
  const requestId = crypto.randomUUID();
  const response = NextResponse.next();
  response.headers.set("x-request-id", requestId);

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

#### Error Boundaries with Logging

```typescript
"use client";

import React from "react";
import { createChildLogger } from "next-auto-logger";

const logger = createChildLogger({ module: "ErrorBoundary" });

interface ErrorBoundaryState {
  hasError: boolean;
}

interface User {
  id: string;
  name: string;
}

class AppErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error("React error boundary triggered", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      url: typeof window !== "undefined" ? window.location.pathname : "server",
      userId: "user_123", // Get from your auth context
    });
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong.</div>;
    }
    return this.props.children;
  }
}
```

#### Database Query Logging

```typescript
import { createChildLogger, measureDuration } from "next-auto-logger";

const logger = createChildLogger({ module: "Database" });

interface User {
  id: string;
  email: string;
  orders: Order[];
}

interface Order {
  id: string;
  total: number;
}

export async function getUserWithOrders(userId: string): Promise<User | null> {
  return measureDuration(
    "getUserWithOrders",
    async () => {
      logger.info("Fetching user with orders", { userId });

      const user = await db.user.findUnique({
        where: { id: userId },
        include: { orders: true },
      });

      logger.info("Database query completed", {
        userId,
        found: !!user,
        orderCount: user?.orders?.length || 0,
      });

      return user;
    },
    logger
  );
}
```

---

### 🛠️ Level 6: Custom Configuration for Your AWS Setup

#### Environment-Specific Configuration

```typescript
import { createLogger } from "next-auto-logger";

const logger = createLogger({
  // Add deployment context
  contextProvider: () => ({
    deployment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    region: process.env.AWS_REGION,
    version: process.env.BUILD_VERSION,
    commit: process.env.VERCEL_GIT_COMMIT_SHA,
  }),

  // Transform logs for CloudWatch
  transformLog: event => ({
    ...event,
    // Add custom fields for better CloudWatch filtering
    application: "my-nextjs-app",
    service: event.library,
    timestamp: new Date().toISOString(),

    // Remove sensitive data
    ...(event.context?.headers && {
      context: {
        ...event.context,
        headers: Object.fromEntries(
          Object.entries(event.context.headers).filter(
            ([key]) =>
              !["authorization", "cookie", "x-api-key"].includes(
                key.toLowerCase()
              )
          )
        ),
      },
    }),
  }),
});
```

#### Multi-Environment Setup

```typescript
// config/logger.ts
import { createLogger, LoggerConfig } from "next-auto-logger";

const configs: Record<string, Partial<LoggerConfig>> = {
  development: {
    includeBody: true,
    includeHeaders: true,
    // Full logging in dev
  },

  staging: {
    includeBody: true,
    includeHeaders: false,
    // Test CloudWatch setup
  },

  production: {
    includeBody: false,
    includeHeaders: false,
    excludeUrls: ["/api/health", "/api/metrics"],
    // Minimal logging for performance
  },
};

export const logger = createLogger(
  configs[process.env.NODE_ENV || "production"]
);
```

#### Integration with AWS X-Ray

```typescript
import { createLogger } from "next-auto-logger";
import AWSXRay from "aws-xray-sdk-core";

const logger = createLogger({
  contextProvider: () => {
    const segment = AWSXRay.getSegment();
    return {
      traceId: segment?.trace_id,
      segmentId: segment?.id,
    };
  },
});
```

---

### 📋 Complete AWS CloudWatch Setup Guide

#### 1. Vercel + CloudWatch

```bash
# Environment variables in Vercel
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

#### 2. Lambda + CloudWatch (automatic)

No setup needed! Logs automatically go to CloudWatch.

#### 3. ECS/Fargate + CloudWatch

```json
{
  "logConfiguration": {
    "logDriver": "awslogs",
    "options": {
      "awslogs-group": "/aws/ecs/nextjs-app",
      "awslogs-region": "us-east-1",
      "awslogs-stream-prefix": "ecs"
    }
  }
}
```

#### 4. EC2 + CloudWatch Agent

```json
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/nextjs/app.log",
            "log_group_name": "/aws/ec2/nextjs",
            "log_stream_name": "application"
          }
        ]
      }
    }
  }
}
```

---

### 🚀 Migration Guide: From Pain to Paradise

#### From console.log Hell

```typescript
// Before: Console log nightmare
console.log("User:", user.id, "did:", action, "at:", new Date());
console.error("Error in payment:", error);

// After: Structured logging paradise
const logger = createChildLogger({ module: "PaymentFlow" });
logger.info("User action recorded", { userId: user.id, action });
logger.error("Payment processing failed", {
  error: error instanceof Error ? error.message : "Unknown error",
  orderId,
});
```

#### From Manual Pino Setup

```typescript
// Before: Complex Pino configuration and worker thread issues
import pino from "pino";
const logger = pino({
  level: process.env.LOG_LEVEL,
  transport:
    process.env.NODE_ENV === "development"
      ? {
          target: "pino-pretty", // ❌ Causes Next.js worker crashes
          options: { colorize: true },
        }
      : undefined,
  formatters: {
    level: label => ({ level: label }),
  },
  // ... 50 more lines of config prone to breaking
});

// After: Reliable and simple
import { createChildLogger } from "next-auto-logger";
const logger = createChildLogger({ module: "MyModule" });
// JSON everywhere, pretty logs via: npm run dev:pretty
```

#### From AWS CloudWatch Struggle

```sql
-- Before: Searching unstructured logs (impossible)
filter @message like /error/
filter @message like /user/
filter @message like /login/

-- After: Structured queries (actually useful)
fields @timestamp, module, msg, userId, error
| filter level = "error" and module = "Auth"
| filter userId = "user_123"
| sort @timestamp desc
```

---

### 🎯 Why This Is The Only Solution You Need

#### ✅ Built for Next.js

- Works in pages/, app/, components, API routes, middleware
- Handles SSR, SSG, client-side routing seamlessly
- Understands Next.js build process and deployment

#### ✅ Designed for AWS CloudWatch

- Perfect JSON structure for CloudWatch Insights
- Automatic log correlation across client/server
- Built-in rate limiting and security for log endpoints
- Works with Lambda, ECS, EC2, any AWS deployment

#### ✅ Zero Configuration Required

- Smart defaults that actually work
- Structured JSON logs everywhere for reliability
- Optional pretty logs via external piping (`npm run dev:pretty`)
- Auto-detects environment and configures appropriately

#### ✅ Production Battle-Tested

- Handles high-volume applications
- Built-in error handling and fallbacks
- Performance optimized, minimal overhead

#### ❌ What It's Not

- Not a generic logging library (use Pino for that)
- Not for non-Next.js applications
- Not for non-AWS deployments (though it works anywhere)

---

### 🆘 Support & Community

This is the logging solution the Next.js + AWS community has been waiting for. We're here to help:

- 🐛 [Bug Reports](https://github.com/benjamintemple/next-auto-logger/issues)

### 🎉 In Conclusion

Stop fighting with logging. Start debugging like a pro.

**next-auto-logger: Finally, logging that works with Next.js and AWS.**

---

_Made with ❤️ for developers who are tired of logging being harder than it should be._
