// Node host: builds the same host object from node:fs and global fetch.
// `setHost` must be the one exported by the *compiled* host.js of the app graph,
// so the caller passes it in (there is exactly one module instance per graph).
import fs from 'node:fs/promises'
import path from 'node:path'

export function createNodeHost(overrides = {}) {
  return {
    readFile: p => fs.readFile(p, 'utf8'),
    readFileBytes: p => fs.readFile(p),
    writeFile: async (p, d) => { await fs.mkdir(path.dirname(p), { recursive: true }); await fs.writeFile(p, d) },
    readDir: p => fs.readdir(p),
    isDir: async p => { try { return (await fs.stat(p)).isDirectory() } catch { return false } },
    exists: async p => { try { await fs.access(p); return true } catch { return false } },
    mkdir: p => fs.mkdir(p, { recursive: true }),
    rm: p => fs.rm(p, { recursive: true, force: true }),
    copyFile: async (a, b) => { await fs.mkdir(path.dirname(b), { recursive: true }); await fs.copyFile(a, b) },
    stat: async p => { const s = await fs.stat(p); return { size: s.size, mtimeMs: s.mtimeMs, isDir: s.isDirectory() } },
    fetch: async (url, opts) => {
      const res = await globalThis.fetch(url, opts)
      const headers = {}
      res.headers.forEach((v, k) => { headers[k] = v })
      return { status: res.status, ok: res.ok, headers, text: () => res.text(), json: () => res.json() }
    },
    env: n => process.env[n] ?? null,
    cwd: () => process.cwd(),
    now: () => Date.now(),
    log: args => console.log(...args),
    ...overrides,
  }
}

export function installNodeHost(setHost, overrides) {
  const host = createNodeHost(overrides)
  setHost(host)
  return host
}
