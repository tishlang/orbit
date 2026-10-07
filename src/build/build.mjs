// orbit build: compile -> content -> css -> islands -> prerender -> public -> adapter
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { compileSite, instantiate, readUserCss, cssSources, hashOf, buildIslands } from './load.mjs'
import { writeVercelOutput } from './vercel-output.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const t0 = () => { const s = Date.now(); return () => ((Date.now() - s) / 1000).toFixed(1) + 's' }

export async function runBuild({ root, target = 'node', verbose = false }) {
  const done = t0()
  const orbitDir = path.join(root, '.orbit')
  const staticDir = path.join(orbitDir, 'static')
  fs.rmSync(staticDir, { recursive: true, force: true })
  fs.mkdirSync(staticDir, { recursive: true })

  console.log('orbit build →', target)
  const { outDir, entryJs } = await compileSite(root)
  const islands = await buildIslands(root, staticDir)
  const boot = await instantiate(root, { entryJs, staticDir, islands, cssHref: '/_orbit/styles.css' })
  const { entry, site, content } = boot

  // css (hashed)
  const css = entry.css(site, cssSources(root, content), readUserCss(root, site))
  const cssName = 'styles.' + hashOf(css) + '.css'
  fs.mkdirSync(path.join(staticDir, '_orbit'), { recursive: true })
  fs.writeFileSync(path.join(staticDir, '_orbit', cssName), css)
  const app = entry.create({ content, dev: false, islands, css: '/_orbit/' + cssName })

  // client runtime
  for (const f of ['islands.js', 'prefetch.js']) fs.copyFileSync(path.join(here, '..', 'client', f), path.join(staticDir, '_orbit', f))

  // content.json for server functions
  fs.writeFileSync(path.join(orbitDir, 'content.json'), JSON.stringify(entry.slimContent(content)))

  // prerender
  console.log('prerendering…')
  const result = await entry.prerenderAll(app, staticDir, verbose ? (m => console.log(m)) : null)
  console.log(`  ${result.pages.length} pages, ${result.functions.length} server routes`)

  // public/
  if (fs.existsSync(path.join(root, 'public'))) fs.cpSync(path.join(root, 'public'), staticDir, { recursive: true })

  const build = { target, entryJs, serverDir: outDir, staticDir, css: '/_orbit/' + cssName, islands, pages: result.pages, functions: result.functions, redirects: result.redirects, site: { url: site.url ?? null, trailingSlash: site.trailingSlash !== false, functionIncludes: site.functionIncludes ?? ['content'] }, builtAt: new Date().toISOString() }
  fs.writeFileSync(path.join(orbitDir, 'build.json'), JSON.stringify(build, null, 2))

  if (target === 'vercel') await writeVercelOutput(root, build)
  else {
    const dist = path.join(orbitDir, 'dist')
    fs.rmSync(dist, { recursive: true, force: true })
    fs.cpSync(staticDir, path.join(dist, 'static'), { recursive: true })
    console.log('node build in .orbit/  → run `orbit start`')
  }
  console.log('done in', done())
  return build
}
