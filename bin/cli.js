#!/usr/bin/env node

import { program } from 'commander';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { execSync } from 'child_process';

// Package manager detection and installation utilities
function detectPackageManager() {
  if (fs.existsSync('pnpm-lock.yaml')) return 'pnpm';
  if (fs.existsSync('yarn.lock')) return 'yarn';
  if (fs.existsSync('package-lock.json')) return 'npm';
  return 'npm'; // default
}

function isPackageInstalled(packageName) {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    return !!(packageJson.dependencies?.[packageName] || packageJson.devDependencies?.[packageName]);
  } catch {
    return false;
  }
}

function installPackages(packageManager, packages) {
  const packagesStr = packages.join(' ');
  console.log(chalk.blue(`📦 Installing packages: ${packagesStr}`));
  
  try {
    let command;
    switch (packageManager) {
      case 'yarn':
        command = `yarn add ${packagesStr}`;
        break;
      case 'pnpm':
        command = `pnpm add ${packagesStr}`;
        break;
      default:
        command = `npm install ${packagesStr}`;
    }
    
    console.log(chalk.gray(`   Running: ${command}`));
    execSync(command, { stdio: 'inherit' });
    console.log(chalk.green(`✅ Packages installed successfully\n`));
  } catch (error) {
    console.log(chalk.red(`❌ Failed to install packages: ${error.message}`));
    console.log(chalk.yellow('Please install manually:'));
    console.log(chalk.gray(`   ${packageManager === 'yarn' ? 'yarn add' : packageManager === 'pnpm' ? 'pnpm add' : 'npm install'} ${packagesStr}\n`));
  }
}

program
  .name("next-auto-logger")
  .description("Setup next-auto-logger in your Next.js project")
  .version("1.1.5");
program
  .command("init")
  .description("Initialize next-auto-logger in your project")
  .action(async () => {
    console.log(chalk.blue.bold("\n🚀 Welcome to next-auto-logger setup!\n"));
    
    // Check if we're in a Next.js project
    if (
      !fs.existsSync("next.config.js") &&
      !fs.existsSync("next.config.mjs") &&
      !fs.existsSync("next.config.ts")
    ) {
      console.log(chalk.red("❌ This doesn't appear to be a Next.js project."));
      console.log(
        chalk.gray(
          "   Make sure you're in the root directory of your Next.js app.\n"
        )
      );
      process.exit(1);
    }

    // Check if package.json exists
    if (!fs.existsSync('package.json')) {
      console.log(chalk.red("❌ No package.json found."));
      console.log(chalk.gray("   Run 'npm init' first to create a package.json file.\n"));
      process.exit(1);
    }

    // Detect package manager
    const packageManager = detectPackageManager();
    console.log(chalk.gray(`📦 Detected package manager: ${packageManager}\n`));

    // Check for required packages and install if missing
    const requiredPackages = [];
    
    if (!isPackageInstalled('next-auto-logger')) {
      requiredPackages.push('next-auto-logger');
    }
    
    if (!isPackageInstalled('pino')) {
      requiredPackages.push('pino');
    }
    
    if (!isPackageInstalled('pino-pretty')) {
      requiredPackages.push('pino-pretty');
    }

    if (requiredPackages.length > 0) {
      console.log(chalk.yellow(`⚠️  Missing required packages: ${requiredPackages.join(', ')}`));
      console.log(chalk.blue('🔍 These packages are required for next-auto-logger to work properly:\n'));
      
      requiredPackages.forEach(pkg => {
        if (pkg === 'next-auto-logger') {
          console.log(`   • ${chalk.cyan(pkg)} - The main logging library`);
        } else if (pkg === 'pino') {
          console.log(`   • ${chalk.cyan(pkg)} - High-performance JSON logger`);
        } else if (pkg === 'pino-pretty') {
          console.log(`   • ${chalk.cyan(pkg)} - Pretty-print logs in development`);
        }
      });
      
      console.log('');
      
      try {
        const installConfirm = await inquirer.prompt([{
          type: 'confirm',
          name: 'install',
          message: `Install missing packages using ${packageManager}?`,
          default: true
        }]);

        if (installConfirm.install) {
          installPackages(packageManager, requiredPackages);
        } else {
          console.log(chalk.yellow('⚠️  Skipping package installation. You\'ll need to install them manually:'));
          console.log(chalk.gray(`   ${packageManager === 'yarn' ? 'yarn add' : packageManager === 'pnpm' ? 'pnpm add' : 'npm install'} ${requiredPackages.join(' ')}\n`));
        }
      } catch (error) {
        console.log(chalk.red('❌ Interactive prompt failed. Installing packages automatically...'));
        installPackages(packageManager, requiredPackages);
      }
    } else {
      console.log(chalk.green('✅ All required packages are already installed\n'));
    }
    const answers = await inquirer.prompt([
      {
        type: "list",
        name: "router",
        message: "Which Next.js router are you using?",
        choices: [
          "App Router (Next.js 13+) - Recommended",
          "Pages Router (Legacy)",
        ],
        filter: val => (val.startsWith("App") ? "app" : "pages"),
        default: "App Router (Next.js 13+) - Recommended",
      },
      {
        type: "input",
        name: "apiPath",
        message: "API endpoint path for client logs:",
        default: "/api/logs",
        validate: input => {
          if (!input.startsWith("/api/")) {
            return "Path must start with /api/";
          }
          if (input.includes(" ")) {
            return "Path cannot contain spaces";
          }
          return true;
        },
      },
      {
        type: "confirm",
        name: "autoInterceptors",
        message: "Enable automatic request interceptors?",
        default: true,
        suffix: chalk.gray(
          "\n   📖 This automatically logs ALL fetch(), axios, React Query requests\n   ✅ Great for debugging and monitoring\n   ⚠️  Adds small performance overhead\n   🔧 You can disable this later in your code\n  "
        ),
      },
      {
        type: "confirm",
        name: "includeHeaders",
        message: "Include request/response headers in logs?",
        default: false,
        when: answers => answers.autoInterceptors,
        suffix: chalk.gray(
          "\n   📖 Logs HTTP headers like User-Agent, Authorization, etc.\n   ✅ Helpful for debugging authentication issues\n   ⚠️  May log sensitive data (we auto-redact common secrets)\n   💾 Increases log size\n  "
        ),
      },
      {
        type: "confirm",
        name: "includeBody",
        message: "Include request/response bodies in logs?",
        default: false,
        when: answers => answers.autoInterceptors,
        suffix: chalk.gray(
          "\n   📖 Logs the actual data being sent/received\n   ✅ Excellent for debugging API issues\n   ⚠️  Can log sensitive user data (passwords auto-redacted)\n   💾 Significantly increases log size\n   🚨 Only enable in development or staging\n  "
        ),
      },
      {
        type: "list",
        name: "logLevel",
        message: "Default log level for production:",
        choices: [
          "info - Standard logging (recommended)",
          "warn - Only warnings and errors",
          "error - Only errors",
          "debug - Verbose logging (development only)",
        ],
        filter: val => val.split(" ")[0],
        default: "info - Standard logging (recommended)",
        suffix: chalk.gray(
          "\n   📖 Development always uses debug level with pretty printing\n   🏭 Production uses this level with structured JSON\n  "
        ),
      },
      {
        type: "confirm",
        name: "createExample",
        message: "Create example usage file?",
        default: true,
        suffix: chalk.gray(
          "\n   📖 Creates example.ts showing how to use the logger\n   ✅ Great for getting started quickly\n  "
        ),
      },
    ]);
    console.log(chalk.blue("\n📁 Creating files...\n"));
    try {
      // Create API handler
      await createApiHandler(answers);
      // Create example if requested
      if (answers.createExample) {
        await createExample(answers);
      }
      // Create or update environment file
      await updateEnvFile(answers);
      // Show success message
      showSuccessMessage(answers);
    } catch (error) {
      console.log(chalk.red(`❌ Setup failed: ${error.message}`));
      process.exit(1);
    }
  });
async function createApiHandler(answers) {
  const { router, apiPath } = answers;
  
  // Detect if project uses src directory structure
  const hasSrcDir = fs.existsSync("src");
  const baseDir = hasSrcDir ? "src" : ".";
  
  if (router === "app") {
    // App Router: src/app/api/logs/route.ts or app/api/logs/route.ts
    const dirPath = path.join(baseDir, "app", "api", apiPath.replace("/api/", ""));
    const filePath = path.join(dirPath, "route.ts");
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    const template = getAppRouterTemplate(answers);
    fs.writeFileSync(filePath, template);
    console.log(chalk.green(`✅ Created ${filePath}`));
  } else {
    // Pages Router: src/pages/api/logs.ts or pages/api/logs.ts
    const filePath = path.join(
      baseDir,
      "pages",
      "api",
      `${apiPath.replace("/api/", "")}.ts`
    );
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    const template = getPagesRouterTemplate(answers);
    fs.writeFileSync(filePath, template);
    console.log(chalk.green(`✅ Created ${filePath}`));
  }
}
async function createExample(answers) {
  const template = getExampleTemplate(answers);
  
  // Detect if project uses src directory structure
  const hasSrcDir = fs.existsSync("src");
  const filePath = hasSrcDir ? "src/logger-example.ts" : "logger-example.ts";
  
  fs.writeFileSync(filePath, template);
  console.log(chalk.green(`✅ Created ${filePath}`));
}
async function updateEnvFile(answers) {
  const envPath = ".env.local";
  const envContent = `
# next-auto-logger configuration
LOG_LEVEL=${answers.logLevel}
# Uncomment to filter logs by module in development
# LOG_MODULE=Auth,UserService,PaymentFlow
`;
  if (fs.existsSync(envPath)) {
    const existing = fs.readFileSync(envPath, "utf8");
    if (!existing.includes("LOG_LEVEL")) {
      fs.appendFileSync(envPath, envContent);
      console.log(chalk.green(`✅ Updated ${envPath}`));
    }
  } else {
    fs.writeFileSync(envPath, envContent.trim());
    console.log(chalk.green(`✅ Created ${envPath}`));
  }
}
function getAppRouterTemplate(answers) {
  const imports = `export { POST, OPTIONS } from 'next-auto-logger/api';

// ${
    answers.autoInterceptors
      ? "Automatic request interceptors are enabled in your layout.tsx"
      : "To enable automatic request interceptors, add this to your app/layout.tsx:"
  }
// ${
    answers.autoInterceptors
      ? "All fetch(), axios, React Query requests will be logged automatically"
      : "import { createLogger } from 'next-auto-logger'; const logger = createLogger({ autoSetupInterceptors: true });"
  }`;
  return `// next-auto-logger API handler for App Router
// This endpoint receives client-side logs and forwards them to your logging infrastructure

${imports}
`;
}
function getPagesRouterTemplate(answers) {
  const imports = `export { default } from 'next-auto-logger/api';

// ${
    answers.autoInterceptors
      ? "Automatic request interceptors are enabled in your _app.tsx"
      : "To enable automatic request interceptors, add this to your _app.tsx:"
  }
// ${
    answers.autoInterceptors
      ? "All fetch(), axios, React Query requests will be logged automatically"
      : "import { createLogger } from 'next-auto-logger'; const logger = createLogger({ autoSetupInterceptors: true });"
  }`;
  return `// next-auto-logger API handler for Pages Router
// This endpoint receives client-side logs and forwards them to your logging infrastructure

${imports}
`;
}
function getExampleTemplate(answers) {
  const autoInterceptorNote = answers.autoInterceptors
    ? `// 🎉 Automatic logging is enabled! 
// All fetch(), axios, React Query requests are automatically logged

// Manual logging examples:`
    : `// Manual logging examples:
// (Add 'import "next-auto-logger/auto"' to enable automatic request logging)`;
  return `// next-auto-logger usage examples
import { createChildLogger, measureDuration } from 'next-auto-logger';

${autoInterceptorNote}

// 1. Basic component logging
const logger = createChildLogger({ 
  module: 'UserDashboard',
  component: 'LoginForm' 
});

export default function LoginForm() {
  const handleLogin = async (credentials: any) => {
    logger.info('Login attempt started', { email: credentials.email });
    
    try {
      // This fetch will be automatically logged if interceptors are enabled
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
      
      if (response.ok) {
        logger.info('Login successful', { userId: 'user_123' });
      } else {
        logger.warn('Login failed', { status: response.status });
      }
    } catch (error) {
      logger.error('Login error', { error: error.message });
    }
  };

  return <form onSubmit={handleLogin}>...</form>;
}

// 2. API route logging
// app/api/users/route.ts
export async function GET() {
  const logger = createChildLogger({ module: 'UserAPI' });
  
  logger.info('Fetching users');
  
  try {
    const users = await getUsersFromDB();
    logger.info('Users fetched successfully', { count: users.length });
    return Response.json(users);
  } catch (error) {
    logger.error('Failed to fetch users', { error: error.message });
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

// 3. Performance monitoring
export async function processLargeDataset(data: any[]) {
  const logger = createChildLogger({ module: 'DataProcessor' });
  
  return measureDuration(
    'process-dataset',
    async () => {
      // Your expensive operation
      return await heavyProcessing(data);
    },
    logger
  );
}

// 4. CloudWatch queries you can run:
/*
-- Find all errors in the last hour
fields @timestamp, module, msg, error
| filter level = "error"
| sort @timestamp desc

-- Monitor API performance  
fields @timestamp, url, method, duration
| filter duration > 1000
| stats avg(duration), max(duration) by url

-- Track user actions
fields @timestamp, module, msg, userId
| filter userId = "user_123"
| sort @timestamp desc
*/
`;
}
function showSuccessMessage(answers) {
  console.log(chalk.green.bold("\n🎉 next-auto-logger setup complete!\n"));
  console.log(chalk.blue("📋 What was configured:"));
  console.log(
    `   ${chalk.green("✓")} ${
      answers.router === "app" ? "App Router" : "Pages Router"
    } API handler`
  );
  console.log(`   ${chalk.green("✓")} API endpoint: ${answers.apiPath}`);
  console.log(
    `   ${chalk.green("✓")} Auto interceptors: ${
      answers.autoInterceptors ? "Enabled" : "Disabled"
    }`
  );
  if (answers.autoInterceptors) {
    console.log(
      `   ${chalk.green("✓")} Include headers: ${
        answers.includeHeaders ? "Yes" : "No"
      }`
    );
    console.log(
      `   ${chalk.green("✓")} Include bodies: ${
        answers.includeBody ? "Yes" : "No"
      }`
    );
  }
  console.log(`   ${chalk.green("✓")} Log level: ${answers.logLevel}`);
  console.log(chalk.blue("\n🚀 Next steps:"));
  console.log(`   ${chalk.green("✓")} All required packages are installed`);
  console.log(`   ${chalk.green("✓")} API endpoint configured`);
  console.log(`   ${chalk.green("✓")} Environment variables set`);
  console.log("");
  
  if (answers.autoInterceptors) {
    const layoutFile =
      answers.router === "app" ? "app/layout.tsx" : "pages/_app.tsx";
    console.log(`   1. Add this to your ${chalk.yellow(layoutFile)}:`);
    console.log(
      chalk.gray(`      import { createLogger } from 'next-auto-logger';`)
    );
    console.log(
      chalk.gray(
        `      const logger = createLogger({ autoSetupInterceptors: true });`
      )
    );
    console.log("");
  }
  console.log(
    `   ${answers.autoInterceptors ? "2" : "1"}. Start using the logger anywhere:`
  );
  console.log(
    chalk.gray('      import { createChildLogger } from "next-auto-logger";')
  );
  console.log(
    chalk.gray(
      '      const logger = createChildLogger({ module: "MyModule" });'
    )
  );
  console.log(
    chalk.gray('      logger.info("Hello world!", { userId: "123" });')
  );
  console.log("");
  if (answers.createExample) {
    console.log(
      `   ${answers.autoInterceptors ? "3" : "2"}. Check out ${chalk.yellow(
        "logger-example.ts"
      )} for more examples`
    );
    console.log("");
  }
  console.log(
    `   ${
      answers.autoInterceptors
        ? answers.createExample
          ? "4"
          : "3"
        : answers.createExample
        ? "3"
        : "2"
    }. Deploy and view logs in AWS CloudWatch Insights`
  );
  console.log("");
  console.log(chalk.blue("📚 Resources:"));
  console.log(
    "   📖 Documentation: https://github.com/benjamintemple/next-auto-logger"
  );
  console.log(
    "   ☁️  CloudWatch guide: https://docs.aws.amazon.com/AmazonCloudWatch/"
  );
  console.log(
    "   💬 Support: https://github.com/benjamintemple/next-auto-logger/issues"
  );
  console.log("");
  console.log(chalk.green("Happy logging! 🎉\n"));
}
program.parse();
