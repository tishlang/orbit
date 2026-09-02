// Vercel Node function entry (copied into .vercel/output/functions/_orbit.func/index.mjs at build).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { installNodeHost } from './node-host.mjs'
import * as entry from '__ENTRY__'

const here = path.dirname(fileURLToPath(import.meta.url))
process.chdir(here)
installNodeHost(entry.setHost)
const site = entry.site()
const content = JSON.parse(fs.readFileSync(path.join(here, 'content.json'), 'utf8'))
const app = entry.create({ content, dev: false, islands: __ISLANDS__, css: '__CSS__' })

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost')
  const query = {}
  url.searchParams.forEach((v, k) => { query[k] = v })
  const headers = {}
  for (const [k, v] of Object.entries(req.headers)) headers[k] = Array.isArray(v) ? v.join(', ') : v
  const r = await entry.serve(app, { method: req.method, path: url.pathname, query, headers })
  res.statusCode = r.status
  for (const [k, v] of Object.entries(r.headers ?? {})) res.setHeader(k, v)
  if (r.chunks.length === 1 && typeof r.chunks[0] === 'string') { res.end(r.chunks[0]); return }
  for (const c of r.chunks) res.write(typeof c === 'string' ? c : await c)
  res.end()
}
