import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    // Main library entries
    'src/index',
    'src/api'
  ],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: true,
    esbuild: {
      target: 'node16'
    },
    output: {
      exports: 'auto'
    }
  },
  failOnWarn: false
})