// Writes the Vercel Build Output API v3 tree (.vercel/output).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function redirectRoutes(redirects) {
  return redirects.map(r => {
    if (r.from.endsWith('*')) return { src: '^' + esc(r.from.slice(0, -1)) + '(.*)$', headers: { Location: r.to.endsWith('*') ? r.to.slice(0, -1) + '$1' : r.to }, status: r.status ?? 301 }
    if (r.from.includes(':')) {
      let i = 0
      const src = '^' + r.from.replace(/:[A-Za-z0-9_]+/g, () => '([^/]+)') + '/?$'
      const to = r.to.replace(/:[A-Za-z0-9_]+/g, () => '$' + (++i))
      return { src, headers: { Location: to }, status: r.status ?? 301 }
    }
    return { src: '^' + esc(r.from.replace(/\/$/, '')) + '/?$', headers: { Location: r.to }, status: r.status ?? 301 }
  })
}

export async function writeVercelOutput(root, build) {
  const out = path.join(root, '.vercel', 'output')
  fs.rmSync(out, { recursive: true, force: true })
  fs.mkdirSync(path.join(out, 'static'), { recursive: true })
  fs.cpSync(build.staticDir, path.join(out, 'static'), { recursive: true })

  const routes = [...redirectRoutes(build.redirects)]
  // canonical trailing slash: /blog -> /blog/ for every directory-index page (static or isr)
  for (const p of build.pages) {
    if (p.path !== '/' && p.path.endsWith('/') && p.contentType?.includes('text/html')) routes.push({ src: '^' + esc(p.path.replace(/\/$/, '')) + '$', headers: { Location: p.path }, status: 308 })
  }
  routes.push({ handle: 'filesystem' })

  const hasFunctions = build.functions.length > 0
  if (hasFunctions) {
    const fnDir = path.join(out, 'functions', '_orbit.func')
    fs.mkdirSync(fnDir, { recursive: true })
    // compiled server tree (relative imports inside stay valid)
    fs.cpSync(build.serverDir, path.join(fnDir, 'server'), { recursive: true })
    fs.copyFileSync(path.join(root, '.orbit', 'content.json'), path.join(fnDir, 'content.json'))
    fs.copyFileSync(path.join(here, '..', 'runtime', 'node-host.mjs'), path.join(fnDir, 'node-host.mjs'))
    for (const inc of build.site.functionIncludes ?? []) {
      const src = path.join(root, inc)
      if (fs.existsSync(src)) fs.cpSync(src, path.join(fnDir, inc), { recursive: true })
    }
    const entryRel = path.relative(build.serverDir, build.entryJs).split(path.sep).join('/')
    fs.writeFileSync(path.join(fnDir, 'index.mjs'), fs.readFileSync(path.join(here, '..', 'server', 'vercel-fn.mjs'), 'utf8')
      .replace('__ENTRY__', './server/' + entryRel)
      .replace('__CSS__', build.css)
      .replace('__ISLANDS__', JSON.stringify(build.islands)))
    fs.writeFileSync(path.join(fnDir, '.vc-config.json'), JSON.stringify({ runtime: 'nodejs22.x', handler: 'index.mjs', launcherType: 'Nodejs', shouldAddHelpers: true, supportsResponseStreaming: true }, null, 2))
    fs.writeFileSync(path.join(fnDir, 'package.json'), JSON.stringify({ type: 'module' }))

    // ISR: prerendered instances become prerender functions (symlink to _orbit.func) with fallback html
    for (const p of build.pages.filter(p => p.mode === 'isr')) {
      const name = p.path === '/' ? 'index' : p.path.replace(/^\/|\/$/g, '') + '/index'
      const funcPath = path.join(out, 'functions', name + '.func')
      fs.mkdirSync(path.dirname(funcPath), { recursive: true })
      fs.symlinkSync(path.relative(path.dirname(funcPath), fnDir), funcPath)
      const fb = path.join(out, 'functions', name + '.prerender-fallback.html')
      fs.copyFileSync(path.join(build.staticDir, p.file), fb)
      fs.rmSync(path.join(out, 'static', p.file))
      fs.writeFileSync(path.join(out, 'functions', name + '.prerender-config.json'), JSON.stringify({ expiration: p.revalidate ?? 60, fallback: path.basename(fb), group: 1, allowQuery: [] }))
      routes.push({ src: '^' + esc(p.path.replace(/\/$/, '')) + '/?$', dest: '/' + name })
    }
    // dynamic ISR / server routes
    for (const f of build.functions) {
      if (f.mode === 'isr') {
        const name = f.path.replace(/^\//, '').replace(/:([A-Za-z0-9_]+)/g, '[$1]').replace(/\*([A-Za-z0-9_]+)/g, '[...$1]') || 'index'
        const funcPath = path.join(out, 'functions', name + '.func')
        fs.mkdirSync(path.dirname(funcPath), { recursive: true })
        if (!fs.existsSync(funcPath)) fs.symlinkSync(path.relative(path.dirname(funcPath), fnDir), funcPath)
        fs.writeFileSync(path.join(out, 'functions', name + '.prerender-config.json'), JSON.stringify({ expiration: f.revalidate ?? 60, group: 1, allowQuery: [] }))
        routes.push({ src: f.regex.replace(/\/\?\$$/, '/?$'), dest: '/' + name })
      } else {
        routes.push({ src: f.regex.replace(/\/\?\$$/, '/?$'), dest: '/_orbit' })
      }
    }
    routes.push({ src: '^/(.*)$', dest: '/_orbit' })
  } else {
    routes.push({ src: '^/(.*)$', status: 404, dest: '/404.html' })
  }
  const config = {
    version: 3,
    routes,
    overrides: {},
    cache: ['.orbit/**'],
  }
  fs.writeFileSync(path.join(out, 'config.json'), JSON.stringify(config, null, 2))
  console.log(`vercel output: ${build.pages.length} static/isr pages, ${hasFunctions ? 'function _orbit' : 'no functions'} → .vercel/output`)
}
