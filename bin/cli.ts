import { program } from 'commander';
import { input, confirm, select } from '@inquirer/prompts';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { execSync } from 'child_process';

// Handle graceful shutdowns
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n👋 Setup cancelled. You can run "npx next-auto-logger init" again anytime.\n'));
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\n\n👋 Setup cancelled. You can run "npx next-auto-logger init" again anytime.\n'));
  process.exit(0);
});

// Package manager detection and installation utilities
function detectPackageManager() {
  if (fs.existsSync('pnpm-lock.yaml')) return 'pnpm';
  if (fs.existsSync('yarn.lock')) return 'yarn';
  if (fs.existsSync('package-lock.json')) return 'npm';
  return 'npm'; // default
}

function isPackageInstalled(packageName: string) {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    return !!(packageJson.dependencies?.[packageName] || packageJson.devDependencies?.[packageName]);
  } catch {
    return false;
  }
}

function installPackages(packageManager: string, packages: string[]) {
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
  } catch (error: any) {
    console.log(chalk.red(`❌ Failed to install packages: ${error.message}`));
    console.log(chalk.yellow('Please install manually:'));
    console.log(chalk.gray(`   ${packageManager === 'yarn' ? 'yarn add' : packageManager === 'pnpm' ? 'pnpm add' : 'npm install'} ${packagesStr}\n`));
  }
}

// In CommonJS, __dirname is available globally
// No need for import.meta.url workarounds

program
  .name('next-auto-logger')
  .description('Setup next-auto-logger in your Next.js project')
  .version('1.1.5');

program
  .command('init')
  .description('Initialize next-auto-logger in your project')
  .action(async () => {
    console.log(chalk.blue.bold('\n🚀 Welcome to next-auto-logger setup!\n'));
    
    // Check if we're in a Next.js project
    if (!fs.existsSync('next.config.js') && !fs.existsSync('next.config.mjs') && !fs.existsSync('next.config.ts')) {
      console.log(chalk.red('❌ This doesn\'t appear to be a Next.js project.'));
      console.log(chalk.gray('   Make sure you\'re in the root directory of your Next.js app.\n'));
      process.exit(1);
    }

    // Check if package.json exists
    if (!fs.existsSync('package.json')) {
      console.log(chalk.red('❌ No package.json found.'));
      console.log(chalk.gray('   Run \'npm init\' first to create a package.json file.\n'));
      process.exit(1);
    }

    // Detect package manager
    const packageManager = detectPackageManager();
    console.log(chalk.gray(`📦 Detected package manager: ${packageManager}\n`));

    // Check for required packages and install if missing
    const requiredPackages: string[] = [];
    
    if (!isPackageInstalled('next-auto-logger')) {
      requiredPackages.push('next-auto-logger');
    }
    
    if (!isPackageInstalled('pino')) {
      requiredPackages.push('pino');
    }

    if (requiredPackages.length > 0) {
      console.log(chalk.yellow(`⚠️  Missing required packages: ${requiredPackages.join(', ')}`));
      console.log(chalk.blue('🔍 These packages are required for next-auto-logger to work properly:\n'));
      
      requiredPackages.forEach(pkg => {
        if (pkg === 'next-auto-logger') {
          console.log(`   • ${chalk.cyan(pkg)} - The main logging library`);
        } else if (pkg === 'pino') {
          console.log(`   • ${chalk.cyan(pkg)} - High-performance JSON logger`);
        }
      });
      
      console.log('');
      
      try {
        const installConfirm = await confirm({
          message: `Install missing packages using ${packageManager}?`,
          default: true
        });

        if (installConfirm) {
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

    const router = await select({
      message: 'Which Next.js router are you using?',
      choices: [
        { name: 'App Router (Next.js 13+) - Recommended', value: 'app' },
        { name: 'Pages Router (Legacy)', value: 'pages' }
      ],
      default: 'app'
    });

    const apiPath = await input({
      message: 'API endpoint path for client logs:',
      default: '/api/logs',
      validate: (input) => {
        if (!input.startsWith('/api/')) {
          return 'Path must start with /api/';
        }
        if (input.includes(' ')) {
          return 'Path cannot contain spaces';
        }
        return true;
      }
    });

    const autoInterceptors = await confirm({
      message: 'Enable automatic request interceptors?',
      default: true
    });
    console.log(chalk.gray('\n   📖 This automatically logs ALL fetch(), axios, React Query requests\n   ✅ Great for debugging and monitoring\n   ⚠️  Adds small performance overhead\n   🔧 You can disable this later in your code\n'));

    const includeHeaders = autoInterceptors ? await confirm({
      message: 'Include request/response headers in logs?',
      default: false
    }) : false;
    if (autoInterceptors) {
      console.log(chalk.gray('\n   📖 Logs HTTP headers like User-Agent, Authorization, etc.\n   ✅ Helpful for debugging authentication issues\n   ⚠️  May log sensitive data (we auto-redact common secrets)\n   💾 Increases log size\n'));
    }

    const includeBody = autoInterceptors ? await confirm({
      message: 'Include request/response bodies in logs?',
      default: false
    }) : false;
    if (autoInterceptors) {
      console.log(chalk.gray('\n   📖 Logs the actual data being sent/received\n   ✅ Excellent for debugging API issues\n   ⚠️  Can log sensitive user data (passwords auto-redacted)\n   💾 Significantly increases log size\n   🚨 Only enable in development or staging\n'));
    }

    const logLevelChoice = await select({
      message: 'Default log level for production:',
      choices: [
        { name: 'info - Standard logging (recommended)', value: 'info' },
        { name: 'warn - Only warnings and errors', value: 'warn' },
        { name: 'error - Only errors', value: 'error' },
        { name: 'debug - Verbose logging (development only)', value: 'debug' }
      ],
      default: 'info'
    });
    console.log(chalk.gray('\n   📖 Development always uses debug level with pretty printing\n   🏭 Production uses this level with structured JSON\n'));

    const answers = {
      router,
      apiPath,
      autoInterceptors,
      includeHeaders,
      includeBody,
      logLevel: logLevelChoice
    };

    console.log(chalk.blue('\n📁 Creating files...\n'));

    try {
      // Create API handler
      await createApiHandler(answers);
      
      // Create or update environment file
      await updateEnvFile(answers);
      
      // Suggest pretty logging setup
      await suggestPrettyLogging(packageManager);

      // Show success message
      showSuccessMessage(answers);

    } catch (error: any) {
      // Handle graceful cancellation
      if (error?.name === 'ExitPromptError' || error?.message?.includes('SIGINT')) {
        console.log(chalk.yellow('\n👋 Setup cancelled. You can run "npx next-auto-logger init" again anytime.\n'));
        process.exit(0);
      }
      
      console.log(chalk.red(`❌ Setup failed: ${error instanceof Error ? error.message : String(error) || 'Unknown error'}`));
      process.exit(1);
    }
  });

async function createApiHandler(answers: any) {
  const { router, apiPath } = answers;
  
  // Detect if project uses src directory structure
  const hasSrcDir = fs.existsSync('src');
  const baseDir = hasSrcDir ? 'src' : '.';
  
  if (router === 'app') {
    // App Router: src/app/api/logs/route.ts or app/api/logs/route.ts
    const dirPath = path.join(baseDir, 'app', 'api', apiPath.replace('/api/', ''));
    const filePath = path.join(dirPath, 'route.ts');
    
    console.log(chalk.gray(`📁 Creating directory: ${dirPath}`));
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(chalk.gray(`✓ Directory created: ${dirPath}`));
    } else {
      console.log(chalk.gray(`✓ Directory already exists: ${dirPath}`));
    }
    
    console.log(chalk.gray(`📄 Writing file: ${filePath}`));
    const template = getAppRouterTemplate(answers);
    fs.writeFileSync(filePath, template);
    
    console.log(chalk.green(`✅ Created ${filePath}`));
  } else {
    // Pages Router: src/pages/api/logs.ts or pages/api/logs.ts
    const filePath = path.join(baseDir, 'pages', 'api', `${apiPath.replace('/api/', '')}.ts`);
    const dirPath = path.dirname(filePath);
    
    console.log(chalk.gray(`📁 Creating directory: ${dirPath}`));
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(chalk.gray(`✓ Directory created: ${dirPath}`));
    } else {
      console.log(chalk.gray(`✓ Directory already exists: ${dirPath}`));
    }
    
    console.log(chalk.gray(`📄 Writing file: ${filePath}`));
    const template = getPagesRouterTemplate(answers);
    fs.writeFileSync(filePath, template);
    
    console.log(chalk.green(`✅ Created ${filePath}`));
  }
}



async function updateEnvFile(answers: any) {
  const envPath = '.env.local';
  const envContent = `
# next-auto-logger configuration
LOG_LEVEL=${answers.logLevel}
# Uncomment to filter logs by module in development
# LOG_MODULE=Auth,UserService,PaymentFlow
`;

  if (fs.existsSync(envPath)) {
    const existing = fs.readFileSync(envPath, 'utf8');
    if (!existing.includes('LOG_LEVEL')) {
      fs.appendFileSync(envPath, envContent);
      console.log(chalk.green(`✅ Updated ${envPath}`));
    }
  } else {
    fs.writeFileSync(envPath, envContent.trim());
    console.log(chalk.green(`✅ Created ${envPath}`));
  }
}

async function suggestPrettyLogging(packageManager: string) {
  console.log(chalk.blue('\n🎨 Pretty Logging Setup (Optional)'));
  console.log(chalk.gray('next-auto-logger now outputs JSON logs everywhere for reliability.'));
  console.log(chalk.gray('For pretty development logs, you can pipe output through pino-pretty:\n'));
  
  const wantsPrettyLogging = await confirm({
    message: 'Add a dev:pretty script to your package.json for beautiful logs?',
    default: true
  });
  
  if (wantsPrettyLogging) {
    try {
      // Install pino-pretty if not already installed
      if (!isPackageInstalled('pino-pretty')) {
        console.log(chalk.blue('\n📦 Installing pino-pretty for pretty logging...'));
        installPackages(packageManager, ['pino-pretty']);
      }
      
      // Read package.json
      const packageJsonPath = 'package.json';
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Add dev:pretty script
      if (!packageJson.scripts) {
        packageJson.scripts = {};
      }
      
      packageJson.scripts['dev:pretty'] = 'next dev | npx pino-pretty';
      
      // Write back to package.json
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
      
      console.log(chalk.green('✅ Added dev:pretty script to package.json'));
      console.log(chalk.blue('\n💡 Usage:'));
      console.log(chalk.gray(`   Run: ${packageManager === 'yarn' ? 'yarn' : packageManager} run dev:pretty`));
      console.log(chalk.gray('   This gives you beautiful, colored logs in development!'));
      
    } catch (error) {
      console.log(chalk.yellow('⚠️  Could not automatically add dev:pretty script.'));
      console.log(chalk.gray('You can manually add this to your package.json scripts:'));
      console.log(chalk.gray('   "dev:pretty": "next dev | npx pino-pretty"'));
    }
  } else {
    console.log(chalk.gray('\n💡 You can always add pretty logging later by running:'));
    console.log(chalk.gray(`   ${packageManager === 'yarn' ? 'yarn add' : packageManager === 'pnpm' ? 'pnpm add' : 'npm install'} pino-pretty`));
    console.log(chalk.gray('   Then run: next dev | npx pino-pretty'));
  }
}

function getAppRouterTemplate(answers: any) {
  const imports = `export { POST, OPTIONS } from 'next-auto-logger/api';

// ${answers.autoInterceptors ? 'Automatic request interceptors are enabled in your layout.tsx' : 'To enable automatic request interceptors, add this to your app/layout.tsx:'}
// ${answers.autoInterceptors ? 'All fetch(), axios, React Query requests will be logged automatically' : "import { createLogger } from 'next-auto-logger'; const logger = createLogger({ autoSetupInterceptors: true });"}`;

  return `// next-auto-logger API handler for App Router
// This endpoint receives client-side logs and forwards them to your logging infrastructure

${imports}
`;
}

function getPagesRouterTemplate(answers: any) {
  const imports = `export { default } from 'next-auto-logger/api';

// ${answers.autoInterceptors ? 'Automatic request interceptors are enabled in your _app.tsx' : 'To enable automatic request interceptors, add this to your _app.tsx:'}
// ${answers.autoInterceptors ? 'All fetch(), axios, React Query requests will be logged automatically' : "import { createLogger } from 'next-auto-logger'; const logger = createLogger({ autoSetupInterceptors: true });"}`;

  return `// next-auto-logger API handler for Pages Router
// This endpoint receives client-side logs and forwards them to your logging infrastructure

${imports}
`;
}



function showSuccessMessage(answers: any  ) {
  console.log(chalk.green.bold('\n🎉 next-auto-logger setup complete!\n'));
  
  console.log(chalk.blue('📋 What was configured:'));
  console.log(`   ${chalk.green('✓')} ${answers.router === 'app' ? 'App Router' : 'Pages Router'} API handler`);
  console.log(`   ${chalk.green('✓')} API endpoint: ${answers.apiPath}`);
  console.log(`   ${chalk.green('✓')} Auto interceptors: ${answers.autoInterceptors ? 'Enabled' : 'Disabled'}`);
  if (answers.autoInterceptors) {
    console.log(`   ${chalk.green('✓')} Include headers: ${answers.includeHeaders ? 'Yes' : 'No'}`);
    console.log(`   ${chalk.green('✓')} Include bodies: ${answers.includeBody ? 'Yes' : 'No'}`);
  }
  console.log(`   ${chalk.green('✓')} Log level: ${answers.logLevel}`);
  
  console.log(chalk.blue('\n🚀 Next steps:'));
  
  if (answers.autoInterceptors) {
    const layoutFile = answers.router === 'app' ? 'app/layout.tsx' : 'pages/_app.tsx';
    console.log(`   1. Add this to your ${chalk.yellow(layoutFile)}:`);
    console.log(chalk.gray(`      import 'next-auto-logger/auto';`));
    console.log('');
  }
  
  console.log(`   ${answers.autoInterceptors ? '2' : '1'}. Start using the logger:`);
  console.log(chalk.gray('      import { createChildLogger } from "next-auto-logger";'));
  console.log(chalk.gray('      const logger = createChildLogger({ module: "MyModule" });'));
  console.log(chalk.gray('      logger.info("Hello world!", { userId: "123" });'));
  console.log('');
  
  console.log(`   ${answers.autoInterceptors ? '3' : '2'}. Deploy and view logs in AWS CloudWatch Insights`);
  console.log('');
  
  console.log(chalk.blue('📚 Resources:'));
  console.log('   📖 Documentation: https://github.com/benjamintemple/next-auto-logger');
  console.log('   ☁️  CloudWatch guide: https://docs.aws.amazon.com/cloudwatch/');
  console.log('   💬 Support: https://github.com/benjamintemple/next-auto-logger/issues');
  console.log('');
  
  console.log(chalk.green('Happy logging! 🎉\n'));
}

program.parse();