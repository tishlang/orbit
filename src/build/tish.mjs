// Locates and runs the Tish compiler. Never trusts PATH alone (npm shims can shadow it).
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

function candidates(root) {
  const c = []
  if (process.env.TISH_BINARY) c.push(process.env.TISH_BINARY)
  c.push(path.join(root, 'node_modules', '@tishlang', 'tish', 'bin', 'tish'))
  c.push(path.join(here, '..', '..', 'node_modules', '@tishlang', 'tish', 'bin', 'tish'))
  c.push(path.join(root, 'node_modules', '.bin', 'tish'))
  c.push(path.join(process.env.CARGO_HOME ?? path.join(os.homedir(), '.cargo'), 'bin', 'tish'))
  return c
}
export function findTish(root) {
  for (const c of candidates(root)) { try { fs.accessSync(c, fs.constants.X_OK); return c } catch {} }
  return 'tish'
}
export function tish(root, args, opts = {}) {
  const bin = findTish(root)
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { cwd: opts.cwd ?? root, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...(opts.env ?? {}) }, shell: false })
    let out = '', err = ''
    p.stdout.on('data', d => { out += d })
    p.stderr.on('data', d => { err += d })
    p.on('error', reject)
    p.on('close', code => code === 0 ? resolve({ out, err }) : reject(new Error(`tish ${args.join(' ')} failed (${code})\n${err || out}`)))
  })
}
// tish build --target js --format esm; returns absolute path of the compiled entry
export async function compileEsm(root, entry, outDir, extra = []) {
  const { out } = await tish(root, ['build', entry, '-o', outDir, '--target', 'js', '--format', 'esm', '--jsx-import-source', '@tishlang/orbit', ...extra])
  const m = /Entry:\s*(.+)/.exec(out)
  if (!m) throw new Error('tish build did not report an entry file:\n' + out)
  return path.resolve(root, m[1].trim())
}
