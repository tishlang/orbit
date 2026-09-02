// Compiles the site graph and instantiates the app under Node.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { writeManifest, lintNativeImports } from './manifest.mjs'
import { compileEsm, tish } from './tish.mjs'
import { installNodeHost } from '../runtime/node-host.mjs'

let gen = 0
export async function compileSite(root, opts = {}) {
  lintNativeImports(root)
  writeManifest(root)
  const outDir = path.join(root, '.orbit', 'server' + (opts.fresh ? '-' + (++gen) + '-' + Date.now().toString(36) : ''))
  fs.rmSync(outDir, { recursive: true, force: true })
  const entryJs = await compileEsm(root, path.join(root, '.orbit', 'entry.tish'), outDir)
  return { outDir, entryJs }
}

export async function loadEntry(entryJs) {
  return await import(pathToFileURL(entryJs).href + '?t=' + Date.now())
}

export function readUserCss(root, site) {
  const files = site.styles ?? (fs.existsSync(path.join(root, 'styles')) ? fs.readdirSync(path.join(root, 'styles')).filter(f => f.endsWith('.css')).sort().map(f => 'styles/' + f) : [])
  return files.map(f => fs.readFileSync(path.join(root, f), 'utf8'))
}
export function cssSources(root, content) {
  const srcs = []
  const grab = dir => {
    if (!fs.existsSync(dir)) return
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name)
      if (fs.statSync(p).isDirectory()) grab(p)
      else if (/\.(tishx?|md|html|js)$/.test(name)) srcs.push(fs.readFileSync(p, 'utf8'))
    }
  }
  grab(path.join(root, 'pages')); grab(path.join(root, 'components')); grab(path.join(root, 'lib')); grab(path.join(root, 'islands'))
  if (fs.existsSync(path.join(root, 'orbit.config.tish'))) srcs.push(fs.readFileSync(path.join(root, 'orbit.config.tish'), 'utf8'))
  for (const name of Object.keys(content ?? {})) for (const it of content[name]) srcs.push(it.html, JSON.stringify(it.data))
  return srcs
}
export function hashOf(s) { return crypto.createHash('sha1').update(s).digest('hex').slice(0, 8) }

// Islands: copies islands/ verbatim (JS) and compiles .tish islands. Returns { name: file }.
export async function buildIslands(root, staticDir) {
  const dir = path.join(root, 'islands')
  const manifest = {}
  if (!fs.existsSync(dir)) return manifest
  const out = path.join(staticDir, '_orbit', 'islands')
  fs.mkdirSync(out, { recursive: true })
  fs.cpSync(dir, out, { recursive: true, filter: s => !/\.tishx?$/.test(s) })
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    if (fs.statSync(p).isDirectory() || name.startsWith('_')) continue
    if (/\.tishx?$/.test(name)) {
      const base = name.replace(/\.tishx?$/, '')
      const tmp = path.join(root, '.orbit', 'islands-build', base)
      fs.rmSync(tmp, { recursive: true, force: true })
      const { out: o } = await tish(root, ['build', p, '-o', tmp, '--target', 'js', '--format', 'esm'])
      const m = /Entry:\s*(.+)/.exec(o)
      const entry = path.resolve(root, m[1].trim())
      // copy the compiled tree next to the island, entry renamed to <base>.js
      const tree = path.dirname(entry)
      fs.cpSync(tree, path.join(out, '_tish', base), { recursive: true })
      fs.writeFileSync(path.join(out, base + '.js'), `export * from './_tish/${base}/${path.basename(entry)}'\nexport { default } from './_tish/${base}/${path.basename(entry)}'\n`)
      manifest[base] = base + '.js'
    } else if (/\.(m?js)$/.test(name)) {
      manifest[name.replace(/\.m?js$/, '')] = name
    }
  }
  return manifest
}

export async function instantiate(root, { dev = false, entryJs, staticDir, islands, cssHref, data } = {}) {
  const entry = await loadEntry(entryJs)
  installNodeHost(entry.setHost)
  const site = entry.site()
  const content = await entry.content(site)
  const app = entry.create({ content, dev, islands: islands ?? {}, css: cssHref ?? '/_orbit/styles.css', data: data ?? {} })
  return { entry, site, content, app }
}
