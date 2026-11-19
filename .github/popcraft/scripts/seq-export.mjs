// Export a frame's whole timeline as PNG frames without the export watermark, in work-area chunks (a whole
// 1080p sequence is too big for the browser's zip).  node scripts/seq-export.mjs <file.popcraft> <frameId> <outDir> [chunkMs]
import { readFileSync, writeFileSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
const [file, id, out, chunkArg] = process.argv.slice(2)
const chunk = Number(chunkArg ?? 2500)
const src = JSON.parse(readFileSync(file, 'utf8'))
const tl = src.document.nodes[id].timeline
const fps = tl.fps ?? 30
mkdirSync(out, { recursive: true })
let n = 0
for (let a = 0; a < tl.duration; a += chunk) {
  const b = Math.min(tl.duration, a + chunk)
  src.document.nodes[id].timeline = { ...tl, workArea: [a, b] }
  const tmp = join(out, '_chunk.popcraft'); writeFileSync(tmp, JSON.stringify(src))
  const zdir = join(out, '_z'); rmSync(zdir, { recursive: true, force: true })
  const r = spawnSync('./pc.sh', ['run', tmp, 'export.pngSequence', '--id', id, '--range', 'work', '--out', zdir + '/', '--app-url', process.env.APP_URL ?? 'http://localhost:3000'], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' })
  const zips = (() => { try { return readdirSync(zdir).filter(f => f.endsWith('.zip')) } catch { return [] } })()
  if (!zips.length) { console.error(`chunk ${a}-${b} failed`, r.stdout.slice(-400), r.stderr.slice(-400)); process.exit(1) }
  spawnSync('unzip', ['-oq', join(zdir, zips[0]), '-d', join(zdir, 'f')])
  const frames = readdirSync(join(zdir, 'f')).filter(f => f.endsWith('.png')).sort()
  for (const f of frames) renameSync(join(zdir, 'f', f), join(out, `f_${String(n++).padStart(5, '0')}.png`))
  console.log(`${a}-${b}: ${frames.length} frames`)
  rmSync(zdir, { recursive: true, force: true }); rmSync(tmp)
}
console.log(`${n} frames at ${fps} fps`)
