#!/usr/bin/env node
// orbit CLI: dev | build [--target vercel|node] | start | new <dir>
import { runBuild } from '../src/build/build.mjs'
import { startDevServer } from '../src/server/node-server.mjs'
import { scaffold } from '../src/build/scaffold.mjs'

const [cmd, ...rest] = process.argv.slice(2)
const flags = {}
const args = []
for (let i = 0; i < rest.length; i++) {
  const a = rest[i]
  if (a.startsWith('--')) { const [k, v] = a.slice(2).split('='); flags[k] = v ?? (rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : true) }
  else args.push(a)
}
const root = process.cwd()
try {
  if (cmd === 'build') {
    const target = flags.target ?? (process.env.VERCEL ? 'vercel' : 'node')
    await runBuild({ root, target, verbose: !!flags.verbose })
  } else if (cmd === 'dev') {
    await startDevServer({ root, port: Number(flags.port ?? process.env.PORT ?? 3000), dev: true })
  } else if (cmd === 'start') {
    await startDevServer({ root, port: Number(flags.port ?? process.env.PORT ?? 3000), dev: false })
  } else if (cmd === 'new') {
    await scaffold({ dir: args[0] ?? 'my-site', template: flags.template ?? 'default' })
  } else {
    console.log(`orbit — hybrid markdown web framework in Tish

  orbit dev [--port 3000]        start the dev server (livereload)
  orbit build [--target vercel]  build to .vercel/output (default on Vercel) or .orbit/dist (node)
  orbit start [--port 3000]      serve a node build
  orbit new <dir>                scaffold a new site
`)
  }
} catch (e) {
  console.error('\x1b[31morbit:\x1b[0m', e?.stack ?? e)
  process.exit(1)
}
