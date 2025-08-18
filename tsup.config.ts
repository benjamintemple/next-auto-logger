import { defineConfig } from 'tsup'

export default defineConfig([
  // Main library build
  {
    entry: ['src/index.ts', 'src/api.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: false,
    minify: false,
  },
  // CLI build  
  {
    entry: ['bin/cli.ts'],
    format: ['cjs'],
    dts: false,
    outDir: 'dist',
    outExtension: () => ({ js: '.cjs' }),
    clean: false,
    splitting: false,
    sourcemap: false,
    minify: false,
    shims: true,
    banner: {
      js: '#!/usr/bin/env node'
    }
  }
])