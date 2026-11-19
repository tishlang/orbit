// Inline a built template's media/ into its .popcraft as data URLs (popcraft run does not ship media/ to the app).
// usage: node scripts/inline.mjs build/<id> [out.popcraft]  → prints frames as JSON [{id,name,w,h}]
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
const dir = process.argv[2], id = basename(dir)
let text = readFileSync(join(dir, `${id}.popcraft`), 'utf8')
const mime = b => b.slice(0, 5).toString() === '<svg ' ? 'image/svg+xml' : b[0] === 0x89 ? 'image/png' : b[0] === 0xff ? 'image/jpeg' : b.slice(0, 4).toString() === 'RIFF' ? 'audio/wav' : 'application/octet-stream'
text = text.replace(/media:\/\/([0-9a-f]{32})/g, (m, h) => {
  const f = join(dir, 'media', h); if (!existsSync(f)) return m
  const b = readFileSync(f); return `data:${mime(b)};base64,${b.toString('base64')}`
})
const out = process.argv[3] ?? join(dir, `${id}.inline.popcraft`)
writeFileSync(out, text)
const d = JSON.parse(text).document
console.log(JSON.stringify(d.nodes[d.pages[0]].childIds.map(i => d.nodes[i]).filter(n => n.type === 'FRAME').map(n => ({ id: n.id, name: n.name, w: n.width, h: n.height }))))
