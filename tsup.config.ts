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
  // CLI build as ESM
  {
    entry: ['bin/cli.ts'],
    format: ['esm'],
    dts: false,
    outDir: 'dist',
    outExtension: () => ({ js: '.mjs' }),
    clean: false,
    splitting: false,
    sourcemap: false,
    minify: false,
    banner: {
      js: '#!/usr/bin/env node'
    }
  }
])