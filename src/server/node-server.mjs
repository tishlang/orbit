// Node server for `orbit dev` (livereload, everything on demand) and `orbit start` (serves a build).
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { compileSite, instantiate, readUserCss, cssSources, buildIslands } from '../build/load.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const MIME = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8', json: 'application/json', xml: 'application/xml', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', ico: 'image/x-icon', txt: 'text/plain; charset=utf-8', woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', wasm: 'application/wasm', glb: 'model/gltf-binary', wgsl: 'text/wgsl', map: 'application/json', mp4: 'video/mp4', webm: 'video/webm', pdf: 'application/pdf' }
const mime = p => MIME[path.extname(p).slice(1).toLowerCase()] ?? 'application/octet-stream'

function sendFile(res, file, extra = {}) {
  res.writeHead(200, { 'content-type': mime(file), ...extra })
  fs.createReadStream(file).pipe(res)
}
function tryStatic(dir, pathname) {
  if (!dir) return null
  const safe = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '')
  const cands = [path.join(dir, safe)]
  if (pathname.endsWith('/')) cands.push(path.join(dir, safe, 'index.html'))
  else cands.push(path.join(dir, safe + '.html'), path.join(dir, safe, 'index.html'))
  for (const c of cands) { try { if (fs.statSync(c).isFile()) return c } catch {} }
  return null
}

export async function startDevServer({ root, port = 3000, dev = true }) {
  const orbitDir = path.join(root, '.orbit')
  let state = null           // { app, entry, css, islands }
  let building = null
  const clients = new Set()
  const cache = new Map()    // ISR cache for `start`
  const staticDir = dev ? null : path.join(orbitDir, 'static')
  const devStatic = path.join(orbitDir, 'dev-static')

  async function build(reason) {
    const t = Date.now()
    try {
      const { entryJs } = await compileSite(root, { fresh: dev })
      fs.rmSync(devStatic, { recursive: true, force: true }); fs.mkdirSync(devStatic, { recursive: true })
      const islands = await buildIslands(root, devStatic)
      const data = dev ? {} : {}
      const boot = await instantiate(root, { dev, entryJs, islands, cssHref: '/_orbit/styles.css', data })
      const css = boot.entry.css(boot.site, cssSources(root, boot.content), readUserCss(root, boot.site))
      state = { ...boot, css, islands }
      cache.clear()
      console.log(`${reason ? reason + ' → ' : ''}ready in ${Date.now() - t}ms  (${Object.values(boot.content).reduce((n, c) => n + c.length, 0)} content items)`)
      for (const c of clients) c.write('event: reload\ndata: 1\n\n')
    } catch (e) {
      console.error('\x1b[31mbuild failed:\x1b[0m', e.message)
      state = state ? { ...state, error: e.message } : { error: e.message }
      for (const c of clients) c.write('event: error\ndata: ' + JSON.stringify(e.message) + '\n\n')
    }
  }
  if (dev) {
    await build()
    const watchDirs = ['pages', 'content', 'islands', 'public', 'styles', 'lib', 'components', 'orbit.config.tish'].map(d => path.join(root, d)).filter(p => fs.existsSync(p))
    let timer = null
    for (const d of watchDirs) {
      fs.watch(d, { recursive: fs.statSync(d).isDirectory() }, (ev, file) => {
        if (file && /(^|\/)\.orbit\//.test(file)) return
        clearTimeout(timer)
        timer = setTimeout(() => { building = build('changed ' + (file ?? path.basename(d))).finally(() => { building = null }) }, 120)
      })
    }
  } else {
    if (!fs.existsSync(path.join(orbitDir, 'build.json'))) throw new Error('no build found; run `orbit build` first')
    const b = JSON.parse(fs.readFileSync(path.join(orbitDir, 'build.json'), 'utf8'))
    const boot = await instantiate(root, { dev: false, entryJs: b.entryJs, islands: b.islands, cssHref: b.css })
    state = { ...boot, islands: b.islands, css: null }
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost')
      const p = url.pathname
      if (dev && p === '/_orbit/events') {
        res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' })
        res.write('event: hello\ndata: 1\n\n'); clients.add(res); req.on('close', () => clients.delete(res)); return
      }
      if (dev && p === '/_orbit/styles.css') { res.writeHead(200, { 'content-type': MIME.css, 'cache-control': 'no-store' }); res.end(state?.css ?? ''); return }
      if (p === '/_orbit/islands.js' || p === '/_orbit/livereload.js' || p === '/_orbit/prefetch.js') { sendFile(res, path.join(here, '..', 'client', path.basename(p)), { 'cache-control': 'no-store' }); return }
      // Trailing slash, as Vercel does it (site.trailingSlash, default true): a static page reached
      // by the other spelling redirects first. Dynamic routes get the same rule in the handler.
      const slash = state?.app?.site?.trailingSlash !== false
      const isFile = p.lastIndexOf('.') > p.lastIndexOf('/')
      if (p.length > 1 && !isFile && !p.startsWith('/_orbit/') && slash !== p.endsWith('/')) {
        const to = slash ? p + '/' : p.slice(0, -1)
        if (tryStatic(staticDir, to) || tryStatic(dev ? devStatic : null, to)) { res.writeHead(308, { location: to + url.search }); res.end(); return }
      }
      const sf = tryStatic(staticDir, p) ?? tryStatic(dev ? devStatic : null, p) ?? tryStatic(dev ? path.join(root, 'public') : null, p)
      if (sf) { sendFile(res, sf, dev ? { 'cache-control': 'no-store' } : {}); return }
      if (building) await building
      if (!state?.app) { res.writeHead(500, { 'content-type': 'text/plain' }); res.end('orbit build failed:\n' + (state?.error ?? 'unknown')); return }
      const query = {}; url.searchParams.forEach((v, k) => { query[k] = v })
      const key = p + url.search
      const hit = !dev && cache.get(key)
      if (hit && hit.expires > Date.now()) { res.writeHead(hit.status, hit.headers); res.end(hit.body); return }
      const r = await state.entry.serve(state.app, { method: req.method, path: p, query, headers: req.headers })
      res.writeHead(r.status, r.headers ?? {})
      if (r.chunks.length === 1 && typeof r.chunks[0] === 'string') {
        const body = r.chunks[0]
        const m = /s-maxage=(\d+)/.exec(r.headers?.['cache-control'] ?? '')
        if (!dev && m) cache.set(key, { status: r.status, headers: r.headers, body, expires: Date.now() + Number(m[1]) * 1000 })
        res.end(body); return
      }
      for (const c of r.chunks) res.write(typeof c === 'string' ? c : await c)
      res.end()
    } catch (e) {
      console.error(e)
      res.writeHead(500, { 'content-type': 'text/plain' }); res.end('orbit error: ' + (e.stack ?? e))
    }
  })
  server.listen(port, () => console.log(`orbit ${dev ? 'dev' : 'start'} → http://localhost:${port}`))
  return server
}
