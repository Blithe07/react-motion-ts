import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  declaration: true,
  clean: true,
  externals: [/^@types\//, 'react'],
  rollup: {
    emitCJS: true,
    esbuild: {
      minify: true,
    },
  },
})
