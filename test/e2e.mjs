// End to end: scaffold the default template, build it for node and for Vercel, serve the node build
// and check what a browser would get. Run with `npm run test:e2e` (needs the tish binary from
// devDependencies). Exits non-zero on the first failed check.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { scaffold } from '../src/build/scaffold.mjs'
import { runBuild } from '../src/build/build.mjs'
import { startDevServer } from '../src/server/node-server.mjs'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let failed = 0
const check = (ok, what, got) => { console.log((ok ? '  ok   ' : '  FAIL ') + what + (ok ? '' : '  (got ' + JSON.stringify(got) + ')')); if (!ok) failed++ }

async function site(name, edit) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-e2e-' + name + '-'))
  fs.rmdirSync(dir)
  await scaffold({ dir, template: 'default' })
  fs.mkdirSync(path.join(dir, 'node_modules', '@tishlang'), { recursive: true })
  fs.symlinkSync(repo, path.join(dir, 'node_modules', '@tishlang', 'orbit'))
  // A relay-style server page: validates the query, redirects with its own headers.
  fs.writeFileSync(path.join(dir, 'pages', 'relay.tish'), `export let render = "server"
export fn load(ctx) {
  let m = /^(\\d{4,5})\\.[A-Za-z0-9_-]{16,128}$/.exec(typeof ctx.query.state === "string" ? ctx.query.state : "")
  if (m === null) { return { status: 400 } }
  return { redirect: "http://127.0.0.1:" + m[1] + "/callback", status: 302, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } }
}
export fn page(ctx) { return <h1>Not a valid sign-in</h1> }
`)
  if (edit) edit(dir)
  return dir
}

async function serve(dir, port) {
  process.chdir(dir) // like the CLI: a site's paths are relative to its folder
  await runBuild({ root: dir, target: 'node' })
  const server = await startDevServer({ root: dir, port, dev: false })
  return server
}

async function get(port, p) {
  const r = await fetch('http://127.0.0.1:' + port + p, { redirect: 'manual' })
  return { status: r.status, location: r.headers.get('location'), headers: r.headers, body: await r.text() }
}

console.log('trailingSlash: true (default)')
{
  const dir = await site('slash')
  const port = 18731
  const server = await serve(dir, port)
  let r = await get(port, '/')
  check(r.status === 200 && r.body.includes('<html'), 'home page renders', r.status)
  check(!/RegExp error/.test(r.body), 'no regex errors in output', null)
  r = await get(port, '/blog')
  check(r.status === 308 && r.location === '/blog/', '/blog redirects to /blog/', [r.status, r.location])
  r = await get(port, '/blog?x=1')
  check(r.location === '/blog/?x=1', 'slash redirect keeps the query', r.location)
  r = await get(port, '/blog/hello-orbit/')
  check(r.status === 200 && r.body.includes('<h1'), 'markdown post renders', r.status)
  r = await get(port, '/posts/hello-orbit')
  check(r.status === 301 && r.location === '/blog/hello-orbit', 'config redirect', [r.status, r.location])
  const t1 = (await get(port, '/time/')).body; await new Promise(z => setTimeout(z, 20)); const t2 = (await get(port, '/time/')).body
  check(t1 !== t2, 'server route renders per request', null)
  r = await get(port, '/relay/?code=x&state=51234.abcdefghijklmnopqrstu')
  check(r.status === 302 && r.location === 'http://127.0.0.1:51234/callback', 'load() redirect', [r.status, r.location])
  check(r.headers.get('cache-control') === 'no-store' && r.headers.get('referrer-policy') === 'no-referrer', 'load() redirect carries its headers', [r.headers.get('cache-control'), r.headers.get('referrer-policy')])
  r = await get(port, '/relay/?state=bad')
  check(r.status === 400, 'load() status', r.status)
  r = await get(port, '/sitemap.xml')
  check(r.status === 200 && r.body.includes('<urlset'), 'sitemap', r.status)
  r = await get(port, '/nope/')
  check(r.status === 404, '404', r.status)
  server.close()
  await runBuild({ root: dir, target: 'vercel' })
  const cfg = JSON.parse(fs.readFileSync(path.join(dir, '.vercel', 'output', 'config.json'), 'utf8'))
  check(cfg.version === 3, 'vercel config v3', cfg.version)
  check(cfg.routes.some(x => x.status === 308 && x.headers?.Location === '/$1/'), 'vercel adds the trailing slash', null)
  check(fs.existsSync(path.join(dir, '.vercel', 'output', 'functions', '_orbit.func', 'index.mjs')), 'vercel server function', null)
  check(fs.existsSync(path.join(dir, '.vercel', 'output', 'static', 'index.html')), 'vercel static pages', null)
  // The function Vercel runs, behind a plain Node server.
  const fn = (await import(path.join(dir, '.vercel', 'output', 'functions', '_orbit.func', 'index.mjs'))).default
  const http = await import('node:http')
  const fnServer = http.createServer((req, res) => fn(req, res)).listen(18733)
  r = await get(18733, '/relay/?code=x&state=51234.abcdefghijklmnopqrstu')
  check(r.status === 302 && r.headers.get('referrer-policy') === 'no-referrer', 'vercel function runs a server route', [r.status, r.location])
  r = await get(18733, '/time/')
  check(r.status === 200 && r.body.includes('Server time'), 'vercel function renders a page', r.status)
  fnServer.close()
}

console.log('trailingSlash: false')
{
  const dir = await site('noslash', d => {
    const f = path.join(d, 'orbit.config.tish')
    fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace('export let site = {', 'export let site = {\n  trailingSlash: false,'))
  })
  const port = 18732
  const server = await serve(dir, port)
  let r = await get(port, '/blog')
  check(r.status === 200, '/blog serves without a slash', r.status)
  r = await get(port, '/blog/')
  check(r.status === 308 && r.location === '/blog', '/blog/ redirects to /blog', [r.status, r.location])
  r = await get(port, '/blog/hello-orbit')
  check(r.status === 200, 'posts live at bare paths', r.status)
  r = await get(port, '/relay?code=x&state=51234.abcdefghijklmnopqrstu')
  check(r.status === 302, 'server route at a bare path', r.status)
  r = await get(port, '/sitemap.xml')
  check(r.body.includes('/blog/hello-orbit<') , 'sitemap uses bare paths', null)
  server.close()
  await runBuild({ root: dir, target: 'vercel' })
  const cfg = JSON.parse(fs.readFileSync(path.join(dir, '.vercel', 'output', 'config.json'), 'utf8'))
  check(!cfg.routes.some(x => x.headers?.Location === '/$1/'), 'vercel does not add a slash', null)
  check(cfg.routes.some(x => x.dest === '/blog/index.html'), 'vercel serves /blog from blog/index.html', null)
}

console.log(failed === 0 ? 'e2e: all checks passed' : 'e2e: ' + failed + ' failed')
process.exit(failed === 0 ? 0 : 1)
